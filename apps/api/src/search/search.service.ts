import { Injectable, Logger } from '@nestjs/common';
import { FollowerTier, Niche, PrimaryPlatform } from '@prisma/client';
import { MeiliSearch } from 'meilisearch';
import { PrismaService } from '@/prisma/prisma.service';

export type CreatorSearchFilters = {
  niche?: string;
  followerTier?: string;
  country?: string;
  platform?: string;
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly meili = new MeiliSearch({
    host: process.env.MEILI_URL ?? 'http://localhost:7700',
    apiKey: process.env.MEILI_MASTER_KEY ?? 'masterKey',
  });

  constructor(private readonly prisma: PrismaService) {}

  private asEnumValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
    if (!value) {
      return undefined;
    }

    return values.includes(value as T) ? (value as T) : undefined;
  }

  private fallbackSearch(query: string, filters: CreatorSearchFilters) {
    const niche = this.asEnumValue(filters.niche, Object.values(Niche));
    const followerTier = this.asEnumValue(
      filters.followerTier,
      Object.values(FollowerTier),
    );
    const platform = this.asEnumValue(
      filters.platform,
      Object.values(PrimaryPlatform),
    );

    return this.prisma.user.findMany({
      where: {
        creatorProfile: {
          is: {
            ...(niche ? { primaryNiche: niche } : {}),
            ...(followerTier ? { followerTier } : {}),
            ...(filters.country ? { country: filters.country } : {}),
            ...(platform ? { primaryPlatform: platform } : {}),
          },
        },
        OR: query
          ? [
              { displayName: { contains: query, mode: 'insensitive' } },
              {
                creatorProfile: {
                  is: {
                    bio: { contains: query, mode: 'insensitive' },
                  },
                },
              },
            ]
          : undefined,
      },
      select: {
        id: true,
        displayName: true,
        username: true,
        creatorProfile: true,
      },
      take: 40,
    });
  }

  private async setupIndex(): Promise<void> {
    try {
      await this.meili.createIndex('creators', { primaryKey: 'id' }).catch(() => {
        return undefined;
      });

      const index = this.meili.index('creators');
      await index.updateFilterableAttributes([
        'primaryNiche',
        'followerTier',
        'country',
        'primaryPlatform',
      ]);
      await index.updateSearchableAttributes([
        'displayName',
        'bio',
        'primaryNiche',
        'secondaryNiches',
        'language',
      ]);
    } catch (error) {
      this.logger.warn('Meilisearch index setup skipped: ' + String(error));
    }
  }

  async indexCreator(userId: string): Promise<void> {
    const creator = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { creatorProfile: true },
    });

    if (!creator?.creatorProfile) {
      return;
    }

    const document = {
      id: creator.id,
      userId: creator.id,
      displayName: creator.displayName,
      username: creator.username,
      bio: creator.creatorProfile.bio,
      primaryNiche: creator.creatorProfile.primaryNiche,
      secondaryNiches: creator.creatorProfile.secondaryNiches,
      followerTier: creator.creatorProfile.followerTier,
      country: creator.creatorProfile.country,
      language: creator.creatorProfile.language,
      primaryPlatform: creator.creatorProfile.primaryPlatform,
      followerCount: creator.creatorProfile.followerCount,
      growthStyle: creator.creatorProfile.growthStyle,
      photoUrl: creator.creatorProfile.photoUrl,
      creatorProfile: {
        primaryNiche: creator.creatorProfile.primaryNiche,
        secondaryNiches: creator.creatorProfile.secondaryNiches,
        followerTier: creator.creatorProfile.followerTier,
        primaryPlatform: creator.creatorProfile.primaryPlatform,
        followerCount: creator.creatorProfile.followerCount,
        country: creator.creatorProfile.country,
        language: creator.creatorProfile.language,
        bio: creator.creatorProfile.bio,
        photoUrl: creator.creatorProfile.photoUrl,
      },
    };

    try {
      await this.setupIndex();
      await this.meili.index('creators').addDocuments([document], {
        primaryKey: 'id',
      });
    } catch (error) {
      this.logger.warn('Meilisearch indexing failed: ' + String(error));
    }
  }

  async searchCreators(query: string, filters: CreatorSearchFilters) {
    const filterTerms: string[] = [];
    if (filters.niche) filterTerms.push(`primaryNiche = \"${filters.niche}\"`);
    if (filters.followerTier) filterTerms.push(`followerTier = \"${filters.followerTier}\"`);
    if (filters.country) filterTerms.push(`country = \"${filters.country}\"`);
    if (filters.platform) filterTerms.push(`primaryPlatform = \"${filters.platform}\"`);

    try {
      await this.setupIndex();
      const result = await this.meili.index('creators').search(query || '', {
        filter: filterTerms.length ? filterTerms : undefined,
        limit: 40,
      });

      if (result.hits.length) {
        return result.hits;
      }

      return this.fallbackSearch(query, filters);
    } catch {
      return this.fallbackSearch(query, filters);
    }
  }
}
