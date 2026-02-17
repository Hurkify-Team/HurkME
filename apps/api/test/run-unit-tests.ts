import assert from 'node:assert/strict';
import { ReviewStatus } from '@prisma/client';
import { PAYOUT_MODELS } from '@hurkme/shared';
import { toFollowerTier } from '@/common/utils/tier';
import {
  calculatePayoutDistribution,
  sanitizePerformanceWeights,
} from '@/campaigns/payout.utils';
import { normalizeReviewDecision } from '@/admin/review-submission.validation';

type TestCase = {
  name: string;
  run: () => void;
};

const cases: TestCase[] = [
  {
    name: 'tier classification boundaries are deterministic',
    run: () => {
      assert.equal(toFollowerTier(1000), 'T1');
      assert.equal(toFollowerTier(99_999), 'T1');
      assert.equal(toFollowerTier(100_000), 'T2');
      assert.equal(toFollowerTier(499_999), 'T2');
      assert.equal(toFollowerTier(500_000), 'T3');
    },
  },
  {
    name: 'base+bonus payouts sum exactly to payout pool',
    run: () => {
      const result = calculatePayoutDistribution({
        budgetTotal: 1_000_000,
        platformFeePct: 10,
        payoutModel: PAYOUT_MODELS.BASE_BONUS,
        commentsEnabled: true,
        metrics: [
          {
            userId: 'a',
            views: 100_000,
            likes: 8_000,
            comments: 600,
            engagementRate: 0.086,
            authenticityScore: 1,
          },
          {
            userId: 'b',
            views: 60_000,
            likes: 3_000,
            comments: 140,
            engagementRate: 0.052,
            authenticityScore: 0.7,
          },
        ],
      });

      const totalPayout = result.payouts.reduce((sum, row) => sum + row.totalPayout, 0);
      assert.equal(result.platformFee, 100_000);
      assert.equal(result.payoutPool, 900_000);
      assert.equal(totalPayout, result.payoutPool);
      assert.ok(result.payouts[0].totalPayout > result.payouts[1].totalPayout);
    },
  },
  {
    name: 'comment weight redistributes when comments are disabled',
    run: () => {
      const weights = sanitizePerformanceWeights(
        {
          views: 0.4,
          likes: 0.25,
          comments: 0.2,
          engagementRate: 0.15,
        },
        false,
      );

      assert.equal(weights.comments, 0);
      assert.equal(
        Number((weights.views + weights.likes + weights.engagementRate).toFixed(6)),
        1,
      );
    },
  },
  {
    name: 'performance-only payouts have zero base pool',
    run: () => {
      const result = calculatePayoutDistribution({
        budgetTotal: 500_000,
        platformFeePct: 20,
        payoutModel: PAYOUT_MODELS.PERFORMANCE_ONLY,
        commentsEnabled: false,
        metrics: [
          {
            userId: 'a',
            views: 50_000,
            likes: 4_000,
            comments: 0,
            engagementRate: 0.08,
            authenticityScore: 1,
          },
          {
            userId: 'b',
            views: 50_000,
            likes: 4_000,
            comments: 0,
            engagementRate: 0.08,
            authenticityScore: 1,
          },
        ],
      });

      assert.equal(result.basePool, 0);
      assert.equal(
        result.payouts[0].totalPayout + result.payouts[1].totalPayout,
        result.payoutPool,
      );
    },
  },
  {
    name: 'approved review requires verified views and likes',
    run: () => {
      assert.throws(
        () =>
          normalizeReviewDecision({
            reviewStatus: ReviewStatus.APPROVED,
            verifiedViews: 12_000,
          }),
        /Verified likes is required/,
      );
    },
  },
  {
    name: 'rejected review requires notes and disallows metrics',
    run: () => {
      assert.throws(
        () =>
          normalizeReviewDecision({
            reviewStatus: ReviewStatus.REJECTED,
            reviewerNotes: '  ',
          }),
        /Reviewer notes are required/,
      );

      assert.throws(
        () =>
          normalizeReviewDecision({
            reviewStatus: ReviewStatus.REJECTED,
            reviewerNotes: 'Fake screenshot pattern',
            verifiedViews: 1000,
          }),
        /Verified metrics are only allowed/,
      );
    },
  },
  {
    name: 'approved review normalizes metrics and enforces engagement consistency',
    run: () => {
      assert.throws(
        () =>
          normalizeReviewDecision({
            reviewStatus: ReviewStatus.APPROVED,
            verifiedViews: 5_000,
            verifiedLikes: 5_100,
          }),
        /cannot be greater than verified views/,
      );

      const decision = normalizeReviewDecision({
        reviewStatus: ReviewStatus.APPROVED,
        reviewerNotes: '  Looks valid.  ',
        verifiedViews: 10_000,
        verifiedLikes: 800,
        verifiedComments: 120,
      });

      assert.equal(decision.reviewStatus, ReviewStatus.APPROVED);
      assert.equal(decision.reviewerNotes, 'Looks valid.');
      assert.ok(decision.metrics, 'Expected metrics payload for approved reviews');
      assert.equal(decision.metrics.views, 10_000);
      assert.equal(decision.metrics.likes, 800);
      assert.equal(decision.metrics.comments, 120);
      assert.equal(Number(decision.metrics.engagementRate.toFixed(4)), 0.092);
    },
  },
];

let failures = 0;
for (const testCase of cases) {
  try {
    testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL ${testCase.name}: ${message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} deterministic unit tests passed.`);
