import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, PayoutStatus, ReviewStatus } from '@prisma/client';
import { type PayoutModelValue } from '@hurkme/shared';
import { PrismaService } from '@/prisma/prisma.service';
import {
  calculatePayoutDistribution,
  computeAuthenticityScore,
  median,
  type PerformanceWeights,
} from './payout.utils';

@Injectable()
export class PayoutService {
  constructor(private readonly prisma: PrismaService) {}

  private buildProofSignature(links: unknown, media: unknown): string {
    const normalizedLinks = Array.isArray(links)
      ? [...links].map((item) => String(item).trim()).sort()
      : [];
    const normalizedMedia = Array.isArray(media)
      ? [...media].map((item) => String(item).trim()).sort()
      : [];
    return `${normalizedLinks.join('|')}::${normalizedMedia.join('|')}`;
  }

  async computeCampaignPayouts(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        submissions: {
          where: {
            reviewStatus: ReviewStatus.APPROVED,
          },
        },
        metrics: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const approvedSubmissions = campaign.submissions;
    if (!approvedSubmissions.length) {
      return {
        campaignId,
        approvedCount: 0,
        payouts: [],
        message: 'No approved submissions yet',
      };
    }

    const metricMap = new Map(
      campaign.metrics.map((metric) => [`${metric.userId}`, metric]),
    );

    const ratios: number[] = [];
    const signatureCount = new Map<string, number>();

    const baseRows = approvedSubmissions.map((submission) => {
      const existingMetric = metricMap.get(submission.userId);
      const views = existingMetric?.verifiedViews ?? submission.claimedViews;
      const likes = existingMetric?.verifiedLikes ?? submission.claimedLikes;
      const comments =
        existingMetric?.verifiedComments ?? submission.claimedComments ?? 0;
      const engagementRate =
        existingMetric?.engagementRate ?? (likes + comments) / Math.max(1, views);

      if (views > 0) {
        ratios.push(likes / views);
      }

      const signature = this.buildProofSignature(
        submission.proofLinks,
        submission.proofMediaUrls,
      );
      signatureCount.set(signature, (signatureCount.get(signature) ?? 0) + 1);

      return {
        submission,
        views,
        likes,
        comments,
        engagementRate,
        signature,
      };
    });

    const medianRatio = median(ratios);

    const commentsEnabled = baseRows.some((row) => row.comments > 0);

    const metricInputs = baseRows.map((row) => {
      const duplicateProofCount = Math.max(0, (signatureCount.get(row.signature) ?? 1) - 1);
      const authenticityScore = computeAuthenticityScore({
        views: row.views,
        likes: row.likes,
        submittedAt: row.submission.submittedAt,
        campaignStartDate: campaign.startDate,
        medianLikeViewRatio: medianRatio,
        duplicateProofCount,
      });

      return {
        userId: row.submission.userId,
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        engagementRate: row.engagementRate,
        authenticityScore,
      };
    });

    const distribution = calculatePayoutDistribution({
      budgetTotal: campaign.budgetTotal,
      platformFeePct: campaign.platformFeePct,
      payoutModel: campaign.payoutModel as unknown as PayoutModelValue,
      metrics: metricInputs,
      weightOverrides: campaign.performanceWeights as Partial<PerformanceWeights>,
      commentsEnabled,
    });

    await this.prisma.$transaction(async (tx) => {
      for (const payoutResult of distribution.payouts) {
        const source = metricInputs.find((metric) => metric.userId === payoutResult.userId);
        if (!source) {
          continue;
        }

        await tx.campaignMetric.upsert({
          where: {
            campaignId_userId: {
              campaignId,
              userId: payoutResult.userId,
            },
          },
          update: {
            verifiedViews: source.views,
            verifiedLikes: source.likes,
            verifiedComments: source.comments,
            engagementRate: source.engagementRate,
            authenticityScore: source.authenticityScore,
            performanceScore: payoutResult.adjustedPerformanceScore,
            payoutAmount: payoutResult.totalPayout,
            computedAt: new Date(),
          },
          create: {
            campaignId,
            userId: payoutResult.userId,
            verifiedViews: source.views,
            verifiedLikes: source.likes,
            verifiedComments: source.comments,
            engagementRate: source.engagementRate,
            authenticityScore: source.authenticityScore,
            performanceScore: payoutResult.adjustedPerformanceScore,
            payoutAmount: payoutResult.totalPayout,
            computedAt: new Date(),
          },
        });

        await tx.payout.upsert({
          where: {
            campaignId_userId: {
              campaignId,
              userId: payoutResult.userId,
            },
          },
          update: {
            amount: payoutResult.totalPayout,
            status: PayoutStatus.PENDING,
          },
          create: {
            campaignId,
            userId: payoutResult.userId,
            amount: payoutResult.totalPayout,
            status: PayoutStatus.PENDING,
          },
        });
      }

      await tx.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.IN_REVIEW },
      });
    });

    return {
      campaignId,
      approvedCount: approvedSubmissions.length,
      platformFee: distribution.platformFee,
      payoutPool: distribution.payoutPool,
      basePool: distribution.basePool,
      bonusPool: distribution.bonusPool,
      weights: distribution.weights,
      payouts: distribution.payouts,
    };
  }

  async buildPayoutCsv(campaignId: string): Promise<string> {
    const payouts = await this.prisma.payout.findMany({
      where: { campaignId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        amount: 'desc',
      },
    });

    const header = 'campaign_id,user_id,display_name,email,amount,status,paid_at';
    const rows = payouts.map((row) => {
      const paidAt = row.paidAt ? row.paidAt.toISOString() : '';
      return [
        campaignId,
        row.userId,
        row.user.displayName,
        row.user.email,
        row.amount,
        row.status,
        paidAt,
      ]
        .map((value) => {
          const raw = String(value ?? '');
          return raw.includes(',') ? `"${raw.replaceAll('"', '""')}"` : raw;
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  }
}
