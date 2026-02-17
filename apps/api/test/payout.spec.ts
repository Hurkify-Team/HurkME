import { PAYOUT_MODELS } from '@hurkme/shared';
import {
  calculatePayoutDistribution,
  sanitizePerformanceWeights,
} from '@/campaigns/payout.utils';

describe('payout distribution', () => {
  it('computes base+bonus payouts that sum to payout pool', () => {
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

    expect(result.platformFee).toBe(100000);
    expect(result.payoutPool).toBe(900000);

    const totalPayout = result.payouts.reduce((sum, row) => sum + row.totalPayout, 0);
    expect(totalPayout).toBe(result.payoutPool);
    expect(result.payouts[0].totalPayout).toBeGreaterThan(result.payouts[1].totalPayout);
  });

  it('redistributes comments weight when comments are disabled', () => {
    const weights = sanitizePerformanceWeights(
      {
        views: 0.4,
        likes: 0.25,
        comments: 0.2,
        engagementRate: 0.15,
      },
      false,
    );

    expect(weights.comments).toBe(0);
    expect(Number((weights.views + weights.likes + weights.engagementRate).toFixed(6))).toBe(1);
  });

  it('supports performance-only model with zero base pool', () => {
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

    expect(result.basePool).toBe(0);
    expect(result.payouts[0].totalPayout + result.payouts[1].totalPayout).toBe(result.payoutPool);
  });
});
