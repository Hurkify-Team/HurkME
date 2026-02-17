import {
  DEFAULT_PERFORMANCE_WEIGHTS,
  PAYOUT_MODELS,
  type PayoutModelValue,
} from '@hurkme/shared';

export type PerformanceWeights = {
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
};

export type MetricInput = {
  userId: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  authenticityScore: number;
};

export type PayoutResult = {
  userId: string;
  performanceScore: number;
  adjustedPerformanceScore: number;
  baseShare: number;
  bonusShare: number;
  totalPayout: number;
};

export type DistributionResult = {
  platformFee: number;
  payoutPool: number;
  basePool: number;
  bonusPool: number;
  weights: PerformanceWeights;
  payouts: PayoutResult[];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWeights(weights: PerformanceWeights): PerformanceWeights {
  const total = weights.views + weights.likes + weights.comments + weights.engagementRate;
  if (total <= 0) {
    return { ...DEFAULT_PERFORMANCE_WEIGHTS };
  }

  return {
    views: weights.views / total,
    likes: weights.likes / total,
    comments: weights.comments / total,
    engagementRate: weights.engagementRate / total,
  };
}

export function sanitizePerformanceWeights(
  overrides: Partial<PerformanceWeights> | null | undefined,
  commentsEnabled: boolean,
): PerformanceWeights {
  const merged: PerformanceWeights = {
    views: clamp(overrides?.views ?? DEFAULT_PERFORMANCE_WEIGHTS.views, 0.05, 0.8),
    likes: clamp(overrides?.likes ?? DEFAULT_PERFORMANCE_WEIGHTS.likes, 0.05, 0.8),
    comments: clamp(overrides?.comments ?? DEFAULT_PERFORMANCE_WEIGHTS.comments, 0.05, 0.8),
    engagementRate: clamp(
      overrides?.engagementRate ?? DEFAULT_PERFORMANCE_WEIGHTS.engagementRate,
      0.05,
      0.8,
    ),
  };

  if (!commentsEnabled) {
    const transferred = merged.comments;
    merged.comments = 0;

    const totalViewLike = merged.views + merged.likes;
    if (totalViewLike > 0) {
      merged.views += transferred * (merged.views / totalViewLike);
      merged.likes += transferred * (merged.likes / totalViewLike);
    } else {
      merged.views += transferred * 0.5;
      merged.likes += transferred * 0.5;
    }
  }

  return normalizeWeights(merged);
}

function normalizeByMax(values: number[]): number[] {
  const max = Math.max(...values, 0);
  if (max <= 0) {
    return values.map(() => 0);
  }
  return values.map((value) => value / max);
}

function applyLargestRemainder(
  baseAmounts: number[],
  scores: number[],
  totalTarget: number,
): number[] {
  let remainder = totalTarget - baseAmounts.reduce((sum, amount) => sum + amount, 0);
  const rankedIndexes = scores
    .map((score, index) => ({ index, score }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.index);

  let pointer = 0;
  while (remainder > 0 && rankedIndexes.length > 0) {
    const targetIndex = rankedIndexes[pointer % rankedIndexes.length];
    baseAmounts[targetIndex] += 1;
    remainder -= 1;
    pointer += 1;
  }

  return baseAmounts;
}

export function calculatePayoutDistribution(params: {
  budgetTotal: number;
  platformFeePct: number;
  payoutModel: PayoutModelValue;
  metrics: MetricInput[];
  weightOverrides?: Partial<PerformanceWeights> | null;
  commentsEnabled: boolean;
}): DistributionResult {
  const platformFee = Math.floor((params.budgetTotal * params.platformFeePct) / 100);
  const payoutPool = Math.max(0, params.budgetTotal - platformFee);

  if (!params.metrics.length) {
    return {
      platformFee,
      payoutPool,
      basePool: 0,
      bonusPool: 0,
      weights: sanitizePerformanceWeights(params.weightOverrides, params.commentsEnabled),
      payouts: [],
    };
  }

  const basePool =
    params.payoutModel === PAYOUT_MODELS.BASE_BONUS ? Math.floor(payoutPool * 0.2) : 0;
  const bonusPool = payoutPool - basePool;
  const baseShare = Math.floor(basePool / params.metrics.length);

  const weights = sanitizePerformanceWeights(params.weightOverrides, params.commentsEnabled);

  const normalizedViews = normalizeByMax(params.metrics.map((metric) => metric.views));
  const normalizedLikes = normalizeByMax(params.metrics.map((metric) => metric.likes));
  const normalizedComments = normalizeByMax(params.metrics.map((metric) => metric.comments));
  const normalizedEngagement = normalizeByMax(
    params.metrics.map((metric) => metric.engagementRate),
  );

  const rawScores = params.metrics.map((metric, index) => {
    const ps =
      weights.views * normalizedViews[index] +
      weights.likes * normalizedLikes[index] +
      weights.comments * normalizedComments[index] +
      weights.engagementRate * normalizedEngagement[index];

    return {
      userId: metric.userId,
      performanceScore: ps,
      adjustedPerformanceScore: ps * clamp(metric.authenticityScore, 0, 1),
    };
  });

  const adjustedTotal = rawScores.reduce(
    (sum, score) => sum + score.adjustedPerformanceScore,
    0,
  );

  const bonusShares =
    adjustedTotal > 0
      ? applyLargestRemainder(
          rawScores.map((score) =>
            Math.floor((score.adjustedPerformanceScore / adjustedTotal) * bonusPool),
          ),
          rawScores.map((score) => score.adjustedPerformanceScore),
          bonusPool,
        )
      : applyLargestRemainder(
          rawScores.map(() => Math.floor(bonusPool / rawScores.length)),
          rawScores.map(() => 1),
          bonusPool,
        );

  const baseShares = applyLargestRemainder(
    rawScores.map(() => baseShare),
    rawScores.map((score) => score.adjustedPerformanceScore),
    basePool,
  );

  const payouts: PayoutResult[] = rawScores.map((score, index) => ({
    userId: score.userId,
    performanceScore: Number(score.performanceScore.toFixed(6)),
    adjustedPerformanceScore: Number(score.adjustedPerformanceScore.toFixed(6)),
    baseShare: baseShares[index],
    bonusShare: bonusShares[index],
    totalPayout: baseShares[index] + bonusShares[index],
  }));

  return {
    platformFee,
    payoutPool,
    basePool,
    bonusPool,
    weights,
    payouts,
  };
}

export function median(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function computeAuthenticityScore(params: {
  views: number;
  likes: number;
  submittedAt: Date;
  campaignStartDate: Date;
  medianLikeViewRatio: number;
  duplicateProofCount: number;
}): number {
  let score = 1;

  const ratio = params.likes / Math.max(1, params.views);
  if (params.medianLikeViewRatio > 0) {
    if (ratio > params.medianLikeViewRatio * 3 || ratio < params.medianLikeViewRatio * 0.15) {
      score = Math.min(score, 0.7);
    }
  }

  const hoursFromStart =
    (params.submittedAt.getTime() - params.campaignStartDate.getTime()) / (1000 * 60 * 60);
  if (hoursFromStart >= 0 && hoursFromStart < 6 && params.views > 15000) {
    score = Math.min(score, 0.7);
  }

  if (params.duplicateProofCount > 0) {
    score = Math.min(score, 0.4);
  }

  return Number(score.toFixed(2));
}
