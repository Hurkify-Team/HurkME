import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  CampaignStatus,
  Prisma,
  ReviewStatus,
} from '@prisma/client';
import { CampaignsService } from '@/campaigns/campaigns.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PayoutService } from '@/campaigns/payout.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { ListCampaignsAdminDto } from './dto/list-campaigns-admin.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { UpsertCampaignDto } from './dto/upsert-campaign.dto';
import { normalizeReviewDecision } from './review-submission.validation';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
    private readonly payoutService: PayoutService,
  ) {}

  private async logAdminAction(
    adminUserId: string | undefined,
    params: {
      action: string;
      entityType: string;
      entityId?: string;
      payload?: Prisma.InputJsonValue;
    },
  ) {
    if (!adminUserId) {
      return;
    }

    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          payload: params.payload ?? {},
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to persist admin audit log (${params.action}): ${reason}`);
    }
  }

  async listCampaigns(query: ListCampaignsAdminDto) {
    return this.prisma.campaign.findMany({
      where: query.status ? { status: query.status } : {},
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            verified: true,
          },
        },
        _count: {
          select: {
            applications: true,
            submissions: true,
            payouts: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: Math.min(200, query.limit ?? 80),
    });
  }

  async upsertCampaign(dto: UpsertCampaignDto, adminUserId?: string) {
    if (dto.action === 'open' || dto.action === 'close') {
      if (!dto.id) {
        throw new BadRequestException('Campaign id is required for open/close action');
      }

      const campaign = await this.prisma.campaign.update({
        where: { id: dto.id },
        data: {
          status: dto.action === 'open' ? CampaignStatus.OPEN : CampaignStatus.CLOSED,
        },
      });
      await this.logAdminAction(adminUserId, {
        action: dto.action === 'open' ? 'campaign.open' : 'campaign.close',
        entityType: 'campaign',
        entityId: campaign.id,
        payload: {
          status: campaign.status,
        },
      });
      return campaign;
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

    const campaign = await this.prisma.campaign.create({
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
    await this.logAdminAction(adminUserId, {
      action: 'campaign.create',
      entityType: 'campaign',
      entityId: campaign.id,
      payload: {
        title: campaign.title,
        status: campaign.status,
      },
    });
    return campaign;
  }

  async inviteCreator(
    campaignId: string,
    targetUserId: string,
    adminUserId?: string,
  ) {
    const invited = await this.campaignsService.inviteCreatorToCampaign(
      campaignId,
      targetUserId,
    );
    await this.logAdminAction(adminUserId, {
      action: 'campaign.invite_creator',
      entityType: 'campaign_application',
      entityId: invited.id,
      payload: {
        campaignId,
        targetUserId,
        status: invited.status,
      },
    });

    return invited;
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

  async reviewSubmission(submissionId: string, dto: ReviewSubmissionDto, adminUserId?: string) {
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

      if (adminUserId) {
        await tx.adminAuditLog.create({
          data: {
            adminUserId,
            action: 'submission.review',
            entityType: 'campaign_submission',
            entityId: submissionId,
            payload: {
              campaignId: submission.campaignId,
              userId: submission.userId,
              reviewStatus: decision.reviewStatus,
              reviewerNotes: decision.reviewerNotes,
              metrics: decision.reviewStatus === ReviewStatus.APPROVED ? decision.metrics : null,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return updated;
    });
  }

  async computePayouts(campaignId: string, adminUserId?: string) {
    const result = await this.payoutService.computeCampaignPayouts(campaignId);
    await this.logAdminAction(adminUserId, {
      action: 'campaign.compute_payouts',
      entityType: 'campaign',
      entityId: campaignId,
      payload: {
        approvedCount: result.approvedCount,
        payoutPool: result.payoutPool,
      },
    });
    return result;
  }

  async getPayoutReport(campaignId: string, adminUserId?: string) {
    const csv = await this.payoutService.buildPayoutCsv(campaignId);
    const rowCount = Math.max(0, csv.split('\n').length - 1);
    await this.logAdminAction(adminUserId, {
      action: 'campaign.export_payout_report',
      entityType: 'campaign',
      entityId: campaignId,
      payload: {
        rows: rowCount,
      },
    });
    return csv;
  }

  async listAuditLogs(query: ListAuditLogsDto) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        ...(query.adminUserId ? { adminUserId: query.adminUserId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.entityType ? { entityType: query.entityType } : {}),
      },
      include: {
        adminUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(300, query.limit ?? 120),
    });
  }
}
