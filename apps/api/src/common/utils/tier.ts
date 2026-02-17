import type { FollowerTier } from '@prisma/client';
import { classifyFollowerTier } from '@hurkme/shared';

export function toFollowerTier(followerCount: number): FollowerTier {
  return classifyFollowerTier(followerCount) as FollowerTier;
}
