import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReviewStatus } from '@prisma/client';
import { AdminController } from '@/admin/admin.controller';
import { AdminService } from '@/admin/admin.service';
import { CampaignsService } from '@/campaigns/campaigns.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PayoutService } from '@/campaigns/payout.service';
import { ReviewSubmissionDto } from '@/admin/dto/review-submission.dto';

type PrismaTx = {
  campaignSubmission: {
    update: jest.Mock;
  };
  campaignMetric: {
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };
  campaignApplication: {
    updateMany: jest.Mock;
  };
  payout: {
    deleteMany: jest.Mock;
  };
  adminAuditLog: {
    create: jest.Mock;
  };
};

type PrismaMock = {
  campaignSubmission: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  campaignMetric: {
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };
  campaignApplication: {
    updateMany: jest.Mock;
  };
  payout: {
    deleteMany: jest.Mock;
  };
  adminAuditLog: {
    create: jest.Mock;
  };
  $transaction: jest.Mock;
};

type PayoutServiceMock = {
  computeCampaignPayouts: jest.Mock;
  buildPayoutCsv: jest.Mock;
};

type CampaignsServiceMock = {
  inviteCreatorToCampaign: jest.Mock;
};

const submissionId = '6e8b5c96-4582-4f0b-a85d-6c22c673ec40';
const campaignId = 'f05af9ff-32d5-4759-9189-a0671388a08f';
const userId = '2e870a2b-8a68-4609-95de-f5402554fdb1';

function createPrismaMock(): PrismaMock {
  const tx: PrismaTx = {
    campaignSubmission: {
      update: jest.fn(),
    },
    campaignMetric: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    campaignApplication: {
      updateMany: jest.fn(),
    },
    payout: {
      deleteMany: jest.fn(),
    },
    adminAuditLog: {
      create: jest.fn(),
    },
  };

  return {
    campaignSubmission: {
      findUnique: jest.fn(),
      update: tx.campaignSubmission.update,
    },
    campaignMetric: {
      upsert: tx.campaignMetric.upsert,
      deleteMany: tx.campaignMetric.deleteMany,
    },
    campaignApplication: {
      updateMany: tx.campaignApplication.updateMany,
    },
    payout: {
      deleteMany: tx.payout.deleteMany,
    },
    adminAuditLog: {
      create: tx.adminAuditLog.create,
    },
    $transaction: jest.fn(async (fn: (innerTx: PrismaTx) => Promise<unknown>) => fn(tx)),
  };
}

function createPayoutServiceMock(): PayoutServiceMock {
  return {
    computeCampaignPayouts: jest.fn(),
    buildPayoutCsv: jest.fn(),
  };
}

function createCampaignsServiceMock(): CampaignsServiceMock {
  return {
    inviteCreatorToCampaign: jest.fn(),
  };
}

async function validateReviewPayload(payload: Record<string, unknown>) {
  const dto = plainToInstance(ReviewSubmissionDto, payload);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('admin endpoints integration', () => {
  let controller: AdminController;
  let service: AdminService;
  let prisma: PrismaMock;
  let payoutService: PayoutServiceMock;
  let campaignsService: CampaignsServiceMock;
  const adminUser = {
    id: '0d47e9ed-ac75-4d26-90c2-9c723ac95a85',
    authProviderId: 'demo_admin_1',
    email: 'admin@hurkme.test',
    displayName: 'Admin Tester',
    role: 'ADMIN' as const,
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    payoutService = createPayoutServiceMock();
    campaignsService = createCampaignsServiceMock();

    prisma.campaignSubmission.findUnique.mockResolvedValue({
      id: submissionId,
      campaignId,
      userId,
      claimedViews: 1_000,
      claimedLikes: 100,
      claimedComments: 10,
      reviewStatus: ReviewStatus.PENDING,
      reviewerNotes: null,
    });

    prisma.campaignSubmission.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: submissionId,
        campaignId,
        userId,
        reviewStatus: data.reviewStatus,
        reviewerNotes: data.reviewerNotes ?? null,
      }),
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: PayoutService,
          useValue: payoutService,
        },
        {
          provide: CampaignsService,
          useValue: campaignsService,
        },
      ],
    }).compile();

    controller = moduleRef.get(AdminController);
    service = moduleRef.get(AdminService);
  });

  it('rejects unsupported review status at DTO validation level', async () => {
    const { errors } = await validateReviewPayload({
      reviewStatus: 'PENDING',
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(JSON.stringify(errors)).toContain('reviewStatus must be one of the following values');
  });

  it('throws bad request when approval misses verified likes', async () => {
    await expect(
      service.reviewSubmission(submissionId, {
        reviewStatus: ReviewStatus.APPROVED,
        verifiedViews: 10_000,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.campaignMetric.upsert).not.toHaveBeenCalled();
  });

  it('throws bad request when rejection has no reviewer notes', async () => {
    await expect(
      service.reviewSubmission(submissionId, {
        reviewStatus: ReviewStatus.REJECTED,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.campaignApplication.updateMany).not.toHaveBeenCalled();
  });

  it('approves a submission and persists verified metrics', async () => {
    const response = await controller.reviewSubmission(
      adminUser,
      submissionId,
      {
        reviewStatus: ReviewStatus.APPROVED,
        reviewerNotes: 'Looks valid',
        verifiedViews: 9_000,
        verifiedLikes: 700,
        verifiedComments: 40,
      },
    );

    expect(response.reviewStatus).toBe('APPROVED');
    expect(prisma.campaignMetric.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.campaignMetric.upsert.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        create: expect.objectContaining({
          campaignId,
          userId,
          verifiedViews: 9_000,
          verifiedLikes: 700,
          verifiedComments: 40,
        }),
      }),
    );
    expect(
      prisma.campaignMetric.upsert.mock.calls[0][0].create.engagementRate,
    ).toBeCloseTo(0.0822222, 5);
    expect(prisma.campaignApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId, userId },
        data: { status: 'COMPLETED' },
      }),
    );
  });

  it('rejects a submission and clears payout artifacts', async () => {
    const response = await controller.reviewSubmission(
      adminUser,
      submissionId,
      {
        reviewStatus: ReviewStatus.REJECTED,
        reviewerNotes: 'Proof mismatch across screenshots',
      },
    );

    expect(response.reviewStatus).toBe('REJECTED');
    expect(prisma.campaignApplication.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId, userId },
        data: { status: 'DISQUALIFIED' },
      }),
    );
    expect(prisma.campaignMetric.deleteMany).toHaveBeenCalledWith({
      where: { campaignId, userId },
    });
    expect(prisma.payout.deleteMany).toHaveBeenCalledWith({
      where: { campaignId, userId },
    });
  });

  it('computes payouts via controller endpoint contract', async () => {
    payoutService.computeCampaignPayouts.mockResolvedValue({
      campaignId,
      approvedCount: 1,
      payouts: [{ userId, totalPayout: 150_000 }],
    });

    const result = await controller.computePayouts(adminUser, campaignId);
    expect(result).toEqual({
      campaignId,
      approvedCount: 1,
      payouts: [{ userId, totalPayout: 150_000 }],
    });
    expect(payoutService.computeCampaignPayouts).toHaveBeenCalledWith(campaignId);
  });

  it('exports payout report csv via controller endpoint contract', async () => {
    const csv =
      'campaign_id,user_id,amount\nf05af9ff-32d5-4759-9189-a0671388a08f,2e870a2b-8a68-4609-95de-f5402554fdb1,150000';
    payoutService.buildPayoutCsv.mockResolvedValue(csv);

    const response: Pick<Response, 'setHeader' | 'send'> = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    await controller.payoutReport(adminUser, campaignId, response as Response);

    expect(payoutService.buildPayoutCsv).toHaveBeenCalledWith(campaignId);
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `attachment; filename="campaign-${campaignId}-payout-report.csv"`,
    );
    expect(response.send).toHaveBeenCalledWith(csv);
  });
});
