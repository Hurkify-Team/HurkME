import {
  PrismaClient,
  Goal,
  GrowthStyle,
  Niche,
  PrimaryPlatform,
  CampaignTier,
  PayoutModel,
  CampaignStatus,
  UserRole,
  AudienceRegion,
  FollowerTier,
  ApplicationStatus,
} from '@prisma/client';
import { classifyFollowerTier } from '@hurkme/shared';

const prisma = new PrismaClient();

const dailySteps = [
  {
    title: 'Refresh your bio today',
    description: 'Update your bio so new visitors know what you post and why they should follow.',
    type: 'profile',
    difficulty: 1,
    rewardPoints: 10,
    targetGoals: [Goal.FIRST_FOLLOWERS, Goal.AUTHORITY],
    targetGrowthStyles: [GrowthStyle.DAILY_STEPS, GrowthStyle.DATA_LIGHT_GUIDANCE],
    targetNiches: [Niche.OTHER],
  },
  {
    title: 'Reply to 5 comments',
    description: 'Build trust by replying to comments on your latest post.',
    type: 'engagement',
    difficulty: 1,
    rewardPoints: 12,
    targetGoals: [Goal.BETTER_ENGAGEMENT, Goal.SALES],
    targetGrowthStyles: [GrowthStyle.DAILY_STEPS, GrowthStyle.COLLABORATION],
    targetNiches: [Niche.OTHER],
  },
  {
    title: 'Post with a hook template',
    description: 'Use a strong first line. Keep your first 3 seconds clear and bold.',
    type: 'content',
    difficulty: 2,
    rewardPoints: 15,
    targetGoals: [Goal.FIRST_FOLLOWERS, Goal.MONETIZE],
    targetGrowthStyles: [GrowthStyle.TRENDS, GrowthStyle.DAILY_STEPS],
    targetNiches: [Niche.TECH, Niche.EDUCATION, Niche.BUSINESS],
  },
  {
    title: 'Support 3 creators in your niche',
    description: 'Leave useful comments on 3 creators in your niche and save one post each.',
    type: 'community',
    difficulty: 2,
    rewardPoints: 20,
    targetGoals: [Goal.BETTER_ENGAGEMENT, Goal.AUTHORITY],
    targetGrowthStyles: [GrowthStyle.COLLABORATION],
    targetNiches: [Niche.OTHER],
  },
  {
    title: 'Send 1 collaboration request',
    description: 'Pitch one creator with a clear idea and expected result for both sides.',
    type: 'collaboration',
    difficulty: 2,
    rewardPoints: 20,
    targetGoals: [Goal.MONETIZE, Goal.SALES],
    targetGrowthStyles: [GrowthStyle.COLLABORATION],
    targetNiches: [Niche.OTHER],
  },
  {
    title: 'Share one behind-the-scenes clip',
    description: 'People trust creators they can relate to. Share a short behind-the-scenes clip.',
    type: 'content',
    difficulty: 1,
    rewardPoints: 12,
    targetGoals: [Goal.BETTER_ENGAGEMENT],
    targetGrowthStyles: [GrowthStyle.DAILY_STEPS, GrowthStyle.TRENDS],
    targetNiches: [Niche.LIFESTYLE, Niche.FASHION, Niche.MUSIC, Niche.COMEDY],
  },
];

const nicheCatalog: Array<{ key: Niche; label: string }> = [
  { key: Niche.FITNESS, label: 'Fitness' },
  { key: Niche.TECH, label: 'Tech' },
  { key: Niche.FASHION, label: 'Fashion' },
  { key: Niche.MUSIC, label: 'Music' },
  { key: Niche.BUSINESS, label: 'Business' },
  { key: Niche.EDUCATION, label: 'Education' },
  { key: Niche.LIFESTYLE, label: 'Lifestyle' },
  { key: Niche.COMEDY, label: 'Comedy' },
  { key: Niche.GAMING, label: 'Gaming' },
  { key: Niche.OTHER, label: 'Other' },
];

function toFollowerTier(count: number): FollowerTier {
  return classifyFollowerTier(count) as FollowerTier;
}

async function main() {
  for (const niche of nicheCatalog) {
    await prisma.nicheCatalog.upsert({
      where: { key: niche.key },
      update: {
        label: niche.label,
        active: true,
      },
      create: {
        key: niche.key,
        label: niche.label,
        active: true,
      },
    });
  }

  const [creatorA, creatorB, creatorC, admin] = await Promise.all([
    prisma.user.upsert({
      where: { authProviderId: 'demo_creator_1' },
      update: { displayName: 'Amara Fit' },
      create: {
        authProviderId: 'demo_creator_1',
        email: 'amara@example.com',
        displayName: 'Amara Fit',
        username: 'amarafit',
      },
    }),
    prisma.user.upsert({
      where: { authProviderId: 'demo_creator_2' },
      update: { displayName: 'Tunde Tech' },
      create: {
        authProviderId: 'demo_creator_2',
        email: 'tunde@example.com',
        displayName: 'Tunde Tech',
        username: 'tundetech',
      },
    }),
    prisma.user.upsert({
      where: { authProviderId: 'demo_creator_3' },
      update: { displayName: 'Lola Growth' },
      create: {
        authProviderId: 'demo_creator_3',
        email: 'lola@example.com',
        displayName: 'Lola Growth',
        username: 'lolagrowth',
      },
    }),
    prisma.user.upsert({
      where: { authProviderId: 'demo_admin_1' },
      update: { role: UserRole.ADMIN },
      create: {
        authProviderId: 'demo_admin_1',
        email: 'admin@hurkme.com',
        displayName: 'HurkME Admin',
        username: 'hurkadmin',
        role: UserRole.ADMIN,
      },
    }),
  ]);

  await Promise.all([
    prisma.creatorProfile.upsert({
      where: { userId: creatorA.id },
      update: {
        primaryPlatform: PrimaryPlatform.INSTAGRAM,
        primaryNiche: Niche.FITNESS,
        secondaryNiches: [Niche.LIFESTYLE],
        followerCount: 22000,
        followerTier: toFollowerTier(22000),
        goal: Goal.BETTER_ENGAGEMENT,
        growthStyle: GrowthStyle.DAILY_STEPS,
        audienceRegion: AudienceRegion.AFRICA,
        country: 'NG',
        language: 'English',
        bio: 'Fitness creator helping young professionals stay active.',
        socialLinks: {
          instagram: 'https://instagram.com/amarafit',
        },
      },
      create: {
        userId: creatorA.id,
        primaryPlatform: PrimaryPlatform.INSTAGRAM,
        primaryNiche: Niche.FITNESS,
        secondaryNiches: [Niche.LIFESTYLE],
        followerCount: 22000,
        followerTier: toFollowerTier(22000),
        goal: Goal.BETTER_ENGAGEMENT,
        growthStyle: GrowthStyle.DAILY_STEPS,
        audienceRegion: AudienceRegion.AFRICA,
        country: 'NG',
        language: 'English',
        bio: 'Fitness creator helping young professionals stay active.',
        socialLinks: {
          instagram: 'https://instagram.com/amarafit',
        },
      },
    }),
    prisma.creatorProfile.upsert({
      where: { userId: creatorB.id },
      update: {
        primaryPlatform: PrimaryPlatform.YOUTUBE,
        primaryNiche: Niche.TECH,
        secondaryNiches: [Niche.EDUCATION],
        followerCount: 138000,
        followerTier: toFollowerTier(138000),
        goal: Goal.MONETIZE,
        growthStyle: GrowthStyle.DATA_LIGHT_GUIDANCE,
        audienceRegion: AudienceRegion.GLOBAL,
        country: 'NG',
        language: 'English',
        bio: 'Tech reviews and practical product breakdowns.',
        socialLinks: {
          youtube: 'https://youtube.com/@tundetech',
        },
      },
      create: {
        userId: creatorB.id,
        primaryPlatform: PrimaryPlatform.YOUTUBE,
        primaryNiche: Niche.TECH,
        secondaryNiches: [Niche.EDUCATION],
        followerCount: 138000,
        followerTier: toFollowerTier(138000),
        goal: Goal.MONETIZE,
        growthStyle: GrowthStyle.DATA_LIGHT_GUIDANCE,
        audienceRegion: AudienceRegion.GLOBAL,
        country: 'NG',
        language: 'English',
        bio: 'Tech reviews and practical product breakdowns.',
        socialLinks: {
          youtube: 'https://youtube.com/@tundetech',
        },
      },
    }),
    prisma.creatorProfile.upsert({
      where: { userId: creatorC.id },
      update: {
        primaryPlatform: PrimaryPlatform.TIKTOK,
        primaryNiche: Niche.BUSINESS,
        secondaryNiches: [Niche.EDUCATION],
        followerCount: 590000,
        followerTier: toFollowerTier(590000),
        goal: Goal.SALES,
        growthStyle: GrowthStyle.COLLABORATION,
        audienceRegion: AudienceRegion.AFRICA,
        country: 'NG',
        language: 'English',
        bio: 'Business creator helping founders grow with clear playbooks.',
        socialLinks: {
          tiktok: 'https://tiktok.com/@lolagrowth',
        },
      },
      create: {
        userId: creatorC.id,
        primaryPlatform: PrimaryPlatform.TIKTOK,
        primaryNiche: Niche.BUSINESS,
        secondaryNiches: [Niche.EDUCATION],
        followerCount: 590000,
        followerTier: toFollowerTier(590000),
        goal: Goal.SALES,
        growthStyle: GrowthStyle.COLLABORATION,
        audienceRegion: AudienceRegion.AFRICA,
        country: 'NG',
        language: 'English',
        bio: 'Business creator helping founders grow with clear playbooks.',
        socialLinks: {
          tiktok: 'https://tiktok.com/@lolagrowth',
        },
      },
    }),
  ]);

  for (const step of dailySteps) {
    await prisma.dailyStep.upsert({
      where: { title: step.title },
      update: step,
      create: step,
    });
  }

  const org = await prisma.organization.upsert({
    where: { contactEmail: 'partnerships@naijabrand.com' },
    update: { verified: true },
    create: {
      name: 'Naija Brand Labs',
      contactEmail: 'partnerships@naijabrand.com',
      phone: '+234-800-000-0000',
      verified: true,
    },
  });

  const seededCampaign = await prisma.campaign.upsert({
    where: { title: 'Hustle Hub: Creator Toolkit Launch' },
    update: {
      status: CampaignStatus.OPEN,
    },
    create: {
      orgId: org.id,
      title: 'Hustle Hub: Creator Toolkit Launch',
      description: 'Promote our creator toolkit with one post and one story. Performance-based payout.',
      platform: PrimaryPlatform.INSTAGRAM,
      nicheTarget: Niche.BUSINESS,
      tier: CampaignTier.T1,
      minFollowers: 1000,
      maxFollowers: 200000,
      requiredDeliverables: {
        posts: 1,
        story: 1,
        hashtag: '#HurkMEHustle',
        cta: 'Share your growth lesson and link toolkit in bio',
      },
      performanceWeights: {
        views: 0.4,
        likes: 0.25,
        comments: 0.2,
        engagementRate: 0.15,
      },
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      budgetTotal: 5000000,
      platformFeePct: 15,
      payoutModel: PayoutModel.BASE_BONUS,
      status: CampaignStatus.OPEN,
    },
  });

  await Promise.all([
    prisma.campaignApplication.upsert({
      where: {
        campaignId_userId: {
          campaignId: seededCampaign.id,
          userId: creatorA.id,
        },
      },
      update: {
        status: ApplicationStatus.APPLIED,
      },
      create: {
        campaignId: seededCampaign.id,
        userId: creatorA.id,
        status: ApplicationStatus.APPLIED,
      },
    }),
    prisma.campaignApplication.upsert({
      where: {
        campaignId_userId: {
          campaignId: seededCampaign.id,
          userId: creatorB.id,
        },
      },
      update: {
        status: ApplicationStatus.INVITED,
      },
      create: {
        campaignId: seededCampaign.id,
        userId: creatorB.id,
        status: ApplicationStatus.INVITED,
      },
    }),
  ]);

  await prisma.streak.upsert({
    where: { userId: creatorA.id },
    update: {},
    create: {
      userId: creatorA.id,
      currentStreak: 4,
      longestStreak: 9,
      lastCompletedDate: new Date(),
    },
  });

  console.log(`Seed complete. Admin auth_provider_id: ${admin.authProviderId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
