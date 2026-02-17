export type FollowerTier = 'T1' | 'T2' | 'T3';

export const PRIMARY_NICHES = [
  'fitness',
  'tech',
  'fashion',
  'music',
  'business',
  'education',
  'lifestyle',
  'comedy',
  'gaming',
  'other',
] as const;

export type PrimaryNiche = (typeof PRIMARY_NICHES)[number];

export function classifyFollowerTier(followerCount: number): FollowerTier {
  if (followerCount >= 500_000) {
    return 'T3';
  }

  if (followerCount >= 100_000) {
    return 'T2';
  }

  return 'T1';
}

export const DEFAULT_PERFORMANCE_WEIGHTS = {
  views: 0.4,
  likes: 0.25,
  comments: 0.2,
  engagementRate: 0.15,
} as const;

export const PAYOUT_MODELS = {
  BASE_BONUS: 'BASE_BONUS',
  PERFORMANCE_ONLY: 'PERFORMANCE_ONLY',
} as const;

export type PayoutModelValue = (typeof PAYOUT_MODELS)[keyof typeof PAYOUT_MODELS];
