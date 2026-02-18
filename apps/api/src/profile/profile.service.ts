import { Injectable, NotFoundException } from '@nestjs/common';
import { InteractionAction } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { toFollowerTier } from '@/common/utils/tier';
import { JobsService } from '@/jobs/jobs.service';
import { SearchService } from '@/search/search.service';
import { UsersService } from '@/users/users.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly searchService: SearchService,
    private readonly usersService: UsersService,
  ) {}

  async submitOnboarding(userId: string, dto: OnboardingDto) {
    const followerTier = toFollowerTier(dto.followerCount);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
      },
    });

    const profile = await this.prisma.creatorProfile.upsert({
      where: { userId },
      update: {
        primaryPlatform: dto.primaryPlatform,
        primaryNiche: dto.primaryNiche,
        secondaryNiches: dto.secondaryNiches ?? [],
        followerCount: dto.followerCount,
        followerTier,
        goal: dto.goal,
        growthStyle: dto.growthStyle,
        audienceRegion: dto.audienceRegion,
        audienceAgeBand: dto.audienceAgeBand,
        country: dto.country,
        language: dto.language,
        bio: dto.bio,
        photoUrl: dto.photoUrl,
        socialLinks: dto.socialLinks ?? {},
      },
      create: {
        userId,
        primaryPlatform: dto.primaryPlatform,
        primaryNiche: dto.primaryNiche,
        secondaryNiches: dto.secondaryNiches ?? [],
        followerCount: dto.followerCount,
        followerTier,
        goal: dto.goal,
        growthStyle: dto.growthStyle,
        audienceRegion: dto.audienceRegion,
        audienceAgeBand: dto.audienceAgeBand,
        country: dto.country,
        language: dto.language,
        bio: dto.bio,
        photoUrl: dto.photoUrl,
        socialLinks: dto.socialLinks ?? {},
      },
    });

    await this.prisma.streak.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    });

    await Promise.all([
      this.searchService.indexCreator(userId),
      this.jobsService.enqueueUserMatchRefresh(userId),
      this.jobsService.enqueueFeedRefresh(userId),
    ]);

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!existing) {
      throw new NotFoundException('Profile not found. Complete onboarding first.');
    }

    const followerCount = dto.followerCount ?? existing.followerCount;

    if (dto.displayName) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { displayName: dto.displayName },
      });
    }

    const profile = await this.prisma.creatorProfile.update({
      where: { userId },
      data: {
        primaryPlatform: dto.primaryPlatform,
        primaryNiche: dto.primaryNiche,
        secondaryNiches: dto.secondaryNiches,
        followerCount,
        followerTier: toFollowerTier(followerCount),
        goal: dto.goal,
        growthStyle: dto.growthStyle,
        audienceRegion: dto.audienceRegion,
        audienceAgeBand: dto.audienceAgeBand,
        country: dto.country,
        language: dto.language,
        bio: dto.bio,
        photoUrl: dto.photoUrl,
        socialLinks: dto.socialLinks,
      },
    });

    await Promise.all([
      this.searchService.indexCreator(userId),
      this.jobsService.enqueueUserMatchRefresh(userId),
      this.jobsService.enqueueFeedRefresh(userId),
    ]);

    return profile;
  }

  async getCreatorById(userId: string) {
    const creator = await this.usersService.getPublicCreator(userId);

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    return creator;
  }

  async getSavedCreators(userId: string) {
    const saved = await this.prisma.interaction.findMany({
      where: {
        actorUserId: userId,
        action: InteractionAction.SAVE,
      },
      select: {
        targetUserId: true,
        createdAt: true,
        target: {
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
    });

    const seen = new Set<string>();
    const creators: Array<{
      savedAt: Date;
      creator: {
        id: string;
        displayName: string;
        username: string | null;
        creatorProfile: unknown;
        streak: { currentStreak: number } | null;
      };
    }> = [];

    for (const row of saved) {
      if (seen.has(row.targetUserId) || !row.target.creatorProfile) {
        continue;
      }

      seen.add(row.targetUserId);
      creators.push({
        savedAt: row.createdAt,
        creator: {
          id: row.target.id,
          displayName: row.target.displayName,
          username: row.target.username,
          creatorProfile: row.target.creatorProfile,
          streak: row.target.streak,
        },
      });

      if (creators.length >= 100) {
        break;
      }
    }

    return creators;
  }
}
