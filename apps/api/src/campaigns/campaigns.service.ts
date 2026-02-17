import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, CampaignStatus, ReviewStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SubmitCampaignDto } from './dto/submit-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseStatus(status?: string): CampaignStatus | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.toUpperCase();
    if (Object.values(CampaignStatus).includes(normalized as CampaignStatus)) {
      return normalized as CampaignStatus;
    }

    return undefined;
  }

  async getCampaigns(userId: string, status?: string) {
    const parsedStatus = this.parseStatus(status);

    const campaigns = await this.prisma.campaign.findMany({
      where: parsedStatus ? { status: parsedStatus } : {},
      include: {
        organization: true,
        applications: {
          where: { userId },
          select: { status: true },
        },
        submissions: {
          where: { userId },
          select: { reviewStatus: true, submittedAt: true },
        },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });

    return campaigns.map((campaign) => ({
      ...campaign,
      myApplicationStatus: campaign.applications[0]?.status ?? null,
      mySubmissionStatus: campaign.submissions[0]?.reviewStatus ?? null,
      applications: undefined,
      submissions: undefined,
    }));
  }

  async getCampaignById(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        organization: true,
        applications: {
          where: { userId },
        },
        submissions: {
          where: { userId },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async applyToCampaign(userId: string, campaignId: string) {
    const [campaign, profile] = await Promise.all([
      this.prisma.campaign.findUnique({ where: { id: campaignId } }),
      this.prisma.creatorProfile.findUnique({ where: { userId } }),
    ]);

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.OPEN) {
      throw new BadRequestException('Campaign is not open for applications');
    }

    if (!profile) {
      throw new BadRequestException('Complete onboarding before applying');
    }

    if (profile.followerTier !== campaign.tier) {
      throw new BadRequestException('Follower tier does not match this paid job');
    }

    if (profile.followerCount < campaign.minFollowers) {
      throw new BadRequestException('Follower count is below this paid job minimum');
    }

    if (campaign.maxFollowers && profile.followerCount > campaign.maxFollowers) {
      throw new BadRequestException('Follower count is above this paid job maximum');
    }

    return this.prisma.campaignApplication.upsert({
      where: {
        campaignId_userId: {
          campaignId,
          userId,
        },
      },
      update: {
        status: ApplicationStatus.APPLIED,
      },
      create: {
        campaignId,
        userId,
        status: ApplicationStatus.APPLIED,
      },
    });
  }

  async submitCampaignProof(
    userId: string,
    campaignId: string,
    dto: SubmitCampaignDto,
  ) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const allowedSubmissionStatuses: CampaignStatus[] = [
      CampaignStatus.OPEN,
      CampaignStatus.CLOSED,
      CampaignStatus.IN_REVIEW,
    ];

    if (!allowedSubmissionStatuses.includes(campaign.status)) {
      throw new BadRequestException('Campaign does not accept submissions now');
    }

    const application = await this.prisma.campaignApplication.findUnique({
      where: {
        campaignId_userId: {
          campaignId,
          userId,
        },
      },
    });

    if (!application) {
      throw new BadRequestException('Apply to this paid job before submitting proof');
    }

    if (application.status === ApplicationStatus.REJECTED || application.status === ApplicationStatus.DISQUALIFIED) {
      throw new BadRequestException('You are not eligible to submit for this paid job');
    }

    const submission = await this.prisma.campaignSubmission.upsert({
      where: {
        campaignId_userId: {
          campaignId,
          userId,
        },
      },
      update: {
        proofLinks: dto.proofLinks,
        proofMediaUrls: dto.proofMediaUrls,
        claimedViews: dto.claimedViews,
        claimedLikes: dto.claimedLikes,
        claimedComments: dto.claimedComments,
        submittedAt: new Date(),
        reviewStatus: ReviewStatus.PENDING,
      },
      create: {
        campaignId,
        userId,
        proofLinks: dto.proofLinks,
        proofMediaUrls: dto.proofMediaUrls,
        claimedViews: dto.claimedViews,
        claimedLikes: dto.claimedLikes,
        claimedComments: dto.claimedComments,
      },
    });

    await this.prisma.campaignApplication.update({
      where: {
        campaignId_userId: {
          campaignId,
          userId,
        },
      },
      data: {
        status: ApplicationStatus.COMPLETED,
      },
    });

    return submission;
  }
}
