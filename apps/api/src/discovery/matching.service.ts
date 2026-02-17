import { Injectable } from '@nestjs/common';
import { CreatorProfile } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type MatchReasons = {
  samePrimaryNiche: boolean;
  secondaryOverlap: number;
  sameFollowerTier: boolean;
  locationScore: number;
  growthStyleMatch: boolean;
};

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  private secondaryOverlap(a: string[], b: string[]): number {
    if (!a.length || !b.length) {
      return 0;
    }

    const setA = new Set(a);
    const overlap = b.filter((item) => setA.has(item)).length;
    return overlap / Math.max(a.length, b.length);
  }

  private computeLocationScore(a: CreatorProfile, b: CreatorProfile): number {
    const sameCountry = Boolean(a.country && b.country && a.country === b.country);
    const sameLanguage = Boolean(a.language && b.language && a.language === b.language);
    const sameRegion = a.audienceRegion === b.audienceRegion;

    return sameCountry || sameLanguage || sameRegion ? 0.1 : 0;
  }

  private scorePair(source: CreatorProfile, target: CreatorProfile): {
    score: number;
    reasons: MatchReasons;
  } {
    const samePrimaryNiche = source.primaryNiche === target.primaryNiche;
    const secondaryOverlap = this.secondaryOverlap(
      source.secondaryNiches,
      target.secondaryNiches,
    );
    const sameFollowerTier = source.followerTier === target.followerTier;
    const locationScore = this.computeLocationScore(source, target);
    const growthStyleMatch = source.growthStyle === target.growthStyle;

    const score =
      (samePrimaryNiche ? 0.45 : 0) +
      0.2 * secondaryOverlap +
      (sameFollowerTier ? 0.15 : 0) +
      locationScore +
      (growthStyleMatch ? 0.1 : 0);

    return {
      score,
      reasons: {
        samePrimaryNiche,
        secondaryOverlap,
        sameFollowerTier,
        locationScore,
        growthStyleMatch,
      },
    };
  }

  async refreshMatchesForUser(userId: string): Promise<number> {
    const source = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!source) {
      return 0;
    }

    const candidates = await this.prisma.creatorProfile.findMany({
      where: {
        userId: { not: userId },
      },
      take: 5000,
    });

    const ranked = candidates
      .map((candidate) => {
        const result = this.scorePair(source, candidate);
        return {
          matchedUserId: candidate.userId,
          score: result.score,
          reasons: result.reasons,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 200);

    await this.prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { userId } });

      if (!ranked.length) {
        return;
      }

      await tx.match.createMany({
        data: ranked.map((entry) => ({
          userId,
          matchedUserId: entry.matchedUserId,
          score: entry.score,
          reasons: entry.reasons,
        })),
        skipDuplicates: true,
      });
    });

    return ranked.length;
  }

  async refreshAllMatches(): Promise<number> {
    const users = await this.prisma.creatorProfile.findMany({
      select: { userId: true },
    });

    for (const user of users) {
      await this.refreshMatchesForUser(user.userId);
    }

    return users.length;
  }
}
