import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/config/redis.service';
import { SearchService } from '@/search/search.service';
import { startOfToday } from '@/common/utils/date';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { SearchCreatorsDto } from './dto/search-creators.dto';

type FeedItem = {
  type: 'match' | 'rising' | 'discover';
  reason: string;
  creator: {
    id: string;
    displayName: string;
    username: string | null;
    creatorProfile: unknown;
    streak?: { currentStreak: number } | null;
  };
};

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly searchService: SearchService,
  ) {}

  async getFeed(userId: string): Promise<FeedItem[]> {
    const cacheKey = `feed:${userId}`;
    const cached = await this.redisService.getJson<FeedItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const userProfile = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    const matches = await this.prisma.match.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: 30,
      include: {
        matchedUser: {
          select: {
            id: true,
            displayName: true,
            username: true,
            creatorProfile: true,
            streak: {
              select: {
                currentStreak: true,
              },
            },
          },
        },
      },
    });

    const matchItems: FeedItem[] = matches.map((match) => ({
      type: 'match',
      reason: 'Great fit from your Creator DNA',
      creator: {
        id: match.matchedUser.id,
        displayName: match.matchedUser.displayName,
        username: match.matchedUser.username,
        creatorProfile: match.matchedUser.creatorProfile,
        streak: match.matchedUser.streak,
      },
    }));

    const rising = await this.prisma.streak.findMany({
      where: {
        lastCompletedDate: {
          gte: startOfToday(),
        },
        userId: { not: userId },
      },
      orderBy: [{ currentStreak: 'desc' }, { longestStreak: 'desc' }],
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            creatorProfile: true,
          },
        },
      },
    });

    const risingItems: FeedItem[] = rising
      .filter((row) => row.user.creatorProfile)
      .map((row) => ({
        type: 'rising',
        reason: 'Rising creator from recent Daily Steps streak',
        creator: {
          id: row.user.id,
          displayName: row.user.displayName,
          username: row.user.username,
          creatorProfile: row.user.creatorProfile,
          streak: {
            currentStreak: row.currentStreak,
          },
        },
      }));

    const diversityPool = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        creatorProfile: {
          is: userProfile
            ? {
                primaryNiche: { not: userProfile.primaryNiche },
              }
            : {},
        },
      },
      select: {
        id: true,
        displayName: true,
        username: true,
        creatorProfile: true,
      },
      take: 30,
    });

    const randomDiversity = [...diversityPool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6)
      .map((creator) => ({
        type: 'discover' as const,
        reason: 'Fresh voice outside your usual niche',
        creator: {
          id: creator.id,
          displayName: creator.displayName,
          username: creator.username,
          creatorProfile: creator.creatorProfile,
        },
      }));

    const assembled = [...matchItems.slice(0, 18), ...risingItems.slice(0, 6), ...randomDiversity];
    const deduped: FeedItem[] = [];
    const seen = new Set<string>();

    for (const item of assembled) {
      if (!item.creator.creatorProfile) {
        continue;
      }

      if (seen.has(item.creator.id)) {
        continue;
      }

      seen.add(item.creator.id);
      deduped.push(item);
    }

    await this.redisService.setJson(cacheKey, deduped, 45 * 60);
    await this.prisma.feedCache.upsert({
      where: { userId },
      update: {
        items: deduped as Prisma.InputJsonValue,
        generatedAt: new Date(),
      },
      create: {
        userId,
        items: deduped as Prisma.InputJsonValue,
      },
    });

    return deduped;
  }

  async refreshFeed(userId: string): Promise<FeedItem[]> {
    await this.redisService.del(`feed:${userId}`);
    return this.getFeed(userId);
  }

  async refreshFeedsForActiveUsers(): Promise<number> {
    const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

    const [activeBySteps, activeByInteractions] = await Promise.all([
      this.prisma.userDailyStep.findMany({
        where: {
          completedAt: {
            gte: recentThreshold,
          },
        },
        select: { userId: true },
        distinct: ['userId'],
        take: 400,
      }),
      this.prisma.interaction.findMany({
        where: {
          createdAt: {
            gte: recentThreshold,
          },
        },
        select: { actorUserId: true },
        distinct: ['actorUserId'],
        take: 400,
      }),
    ]);

    const userIds = new Set<string>();
    for (const row of activeBySteps) {
      userIds.add(row.userId);
    }
    for (const row of activeByInteractions) {
      userIds.add(row.actorUserId);
    }

    if (!userIds.size) {
      const fallback = await this.prisma.creatorProfile.findMany({
        select: { userId: true },
        take: 100,
      });
      for (const row of fallback) {
        userIds.add(row.userId);
      }
    }

    for (const userId of userIds) {
      await this.refreshFeed(userId);
    }

    return userIds.size;
  }

  async searchCreators(query: SearchCreatorsDto) {
    return this.searchService.searchCreators(query.q ?? '', {
      niche: query.niche,
      followerTier: query.followerTier,
      country: query.country,
      platform: query.platform,
    });
  }

  async saveInteraction(actorUserId: string, dto: CreateInteractionDto) {
    const interaction = await this.prisma.interaction.create({
      data: {
        actorUserId,
        targetUserId: dto.targetUserId,
        action: dto.action,
        meta: (dto.meta ?? {}) as Prisma.InputJsonValue,
      },
    });

    await this.redisService.del(`feed:${actorUserId}`);

    return interaction;
  }
}
