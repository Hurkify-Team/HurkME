import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CampaignStatus,
  Prisma,
  ReviewStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PayoutService } from '@/campaigns/payout.service';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { UpsertCampaignDto } from './dto/upsert-campaign.dto';
import { normalizeReviewDecision } from './review-submission.validation';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
  ) {}

  async upsertCampaign(dto: UpsertCampaignDto) {
    if (dto.action === 'open' || dto.action === 'close') {
      if (!dto.id) {
        throw new BadRequestException('Campaign id is required for open/close action');
      }

      return this.prisma.campaign.update({
        where: { id: dto.id },
        data: {
          status: dto.action === 'open' ? CampaignStatus.OPEN : CampaignStatus.CLOSED,
        },
      });
    }

    if (dto.action !== 'create') {
      throw new BadRequestException('Unsupported action');
    }

    const requiredFields: Array<keyof UpsertCampaignDto> = [
      'title',
      'description',
      'platform',
      'nicheTarget',
      'tier',
      'minFollowers',
      'requiredDeliverables',
      'startDate',
      'endDate',
      'budgetTotal',
      'platformFeePct',
      'payoutModel',
    ];

    const missing = requiredFields.filter((field) => dto[field] === undefined);
    if (missing.length) {
      throw new BadRequestException(`Missing fields: ${missing.join(', ')}`);
    }

    const orgId =
      dto.orgId ??
      (
        await this.prisma.organization.findFirst({
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        })
      )?.id;

    if (!orgId) {
      throw new BadRequestException('Create an organization before creating campaigns');
    }

    return this.prisma.campaign.create({
      data: {
        orgId,
        title: dto.title!,
        description: dto.description!,
        platform: dto.platform!,
        nicheTarget: dto.nicheTarget!,
        tier: dto.tier!,
        minFollowers: dto.minFollowers!,
        maxFollowers: dto.maxFollowers,
        requiredDeliverables:
          dto.requiredDeliverables! as Prisma.InputJsonValue,
        performanceWeights: (dto.performanceWeights ??
          {}) as Prisma.InputJsonValue,
        startDate: new Date(dto.startDate!),
        endDate: new Date(dto.endDate!),
        budgetTotal: dto.budgetTotal!,
        platformFeePct: dto.platformFeePct!,
        payoutModel: dto.payoutModel!,
        status: dto.status ?? CampaignStatus.DRAFT,
      },
    });
  }

  async listSubmissions(params: { campaignId?: string; reviewStatus?: ReviewStatus }) {
    return this.prisma.campaignSubmission.findMany({
      where: {
        ...(params.campaignId ? { campaignId: params.campaignId } : {}),
        ...(params.reviewStatus ? { reviewStatus: params.reviewStatus } : {}),
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 200,
    });
  }

  async reviewSubmission(submissionId: string, dto: ReviewSubmissionDto) {
    const submission = await this.prisma.campaignSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    let decision: ReturnType<typeof normalizeReviewDecision>;
    try {
      decision = normalizeReviewDecision(dto);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid review payload',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.campaignSubmission.update({
        where: { id: submissionId },
        data: {
          reviewStatus: decision.reviewStatus,
          reviewerNotes: decision.reviewerNotes,
        },
      });

      if (decision.reviewStatus === ReviewStatus.APPROVED) {
        await tx.campaignMetric.upsert({
          where: {
            campaignId_userId: {
              campaignId: submission.campaignId,
              userId: submission.userId,
            },
          },
          update: {
            verifiedViews: decision.metrics.views,
            verifiedLikes: decision.metrics.likes,
            verifiedComments: decision.metrics.comments,
            engagementRate: decision.metrics.engagementRate,
            authenticityScore: 1,
            computedAt: new Date(),
          },
          create: {
            campaignId: submission.campaignId,
            userId: submission.userId,
            verifiedViews: decision.metrics.views,
            verifiedLikes: decision.metrics.likes,
            verifiedComments: decision.metrics.comments,
            engagementRate: decision.metrics.engagementRate,
            authenticityScore: 1,
            computedAt: new Date(),
          },
        });

        await tx.campaignApplication.updateMany({
          where: {
            campaignId: submission.campaignId,
            userId: submission.userId,
          },
          data: {
            status: ApplicationStatus.COMPLETED,
          },
        });
      }

      if (decision.reviewStatus === ReviewStatus.REJECTED) {
        await tx.campaignApplication.updateMany({
          where: {
            campaignId: submission.campaignId,
            userId: submission.userId,
          },
          data: {
            status: ApplicationStatus.DISQUALIFIED,
          },
        });

        await tx.campaignMetric.deleteMany({
          where: {
            campaignId: submission.campaignId,
            userId: submission.userId,
          },
        });

        await tx.payout.deleteMany({
          where: {
            campaignId: submission.campaignId,
            userId: submission.userId,
          },
        });
      }

      return updated;
    });
  }

  async computePayouts(campaignId: string) {
    return this.payoutService.computeCampaignPayouts(campaignId);
  }

  async getPayoutReport(campaignId: string) {
    return this.payoutService.buildPayoutCsv(campaignId);
  }
}
