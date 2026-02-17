import { z } from 'zod';

export const onboardingSchema = z.object({
  primaryPlatform: z.enum(['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X', 'LINKEDIN']),
  primaryNiche: z.enum([
    'FITNESS',
    'TECH',
    'FASHION',
    'MUSIC',
    'BUSINESS',
    'EDUCATION',
    'LIFESTYLE',
    'COMEDY',
    'GAMING',
    'OTHER',
  ]),
  secondaryNiches: z.array(
    z.enum([
      'FITNESS',
      'TECH',
      'FASHION',
      'MUSIC',
      'BUSINESS',
      'EDUCATION',
      'LIFESTYLE',
      'COMEDY',
      'GAMING',
      'OTHER',
    ]),
  ),
  followerCount: z.number().min(1000),
  goal: z.enum(['FIRST_FOLLOWERS', 'BETTER_ENGAGEMENT', 'MONETIZE', 'AUTHORITY', 'SALES']),
  growthStyle: z.enum(['DAILY_STEPS', 'COLLABORATION', 'TRENDS', 'DATA_LIGHT_GUIDANCE']),
  audienceRegion: z.enum(['LOCAL', 'AFRICA', 'GLOBAL', 'SPECIFIC_COUNTRY']),
  audienceAgeBand: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  displayName: z.string().min(2).max(60),
  bio: z.string().max(280).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  socialLinks: z.record(z.string(), z.string()).optional(),
});

export const proofSubmissionSchema = z.object({
  proofLinks: z.array(z.string().url()).min(1),
  proofMediaUrls: z.array(z.string().url()).min(1),
  claimedViews: z.number().min(0),
  claimedLikes: z.number().min(0),
  claimedComments: z.number().min(0).optional(),
});

export const adminReviewSchema = z
  .object({
    reviewStatus: z.enum(['APPROVED', 'REJECTED']),
    reviewerNotes: z.string().max(500).optional(),
    verifiedViews: z.number().int().min(0).max(500_000_000).optional(),
    verifiedLikes: z.number().int().min(0).max(100_000_000).optional(),
    verifiedComments: z.number().int().min(0).max(10_000_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reviewStatus === 'APPROVED') {
      if (value.verifiedViews === undefined) {
        ctx.addIssue({
          path: ['verifiedViews'],
          code: z.ZodIssueCode.custom,
          message: 'Verified views is required for approval',
        });
      }

      if (value.verifiedLikes === undefined) {
        ctx.addIssue({
          path: ['verifiedLikes'],
          code: z.ZodIssueCode.custom,
          message: 'Verified likes is required for approval',
        });
      }

      if (
        value.verifiedViews !== undefined &&
        value.verifiedLikes !== undefined &&
        value.verifiedLikes > value.verifiedViews
      ) {
        ctx.addIssue({
          path: ['verifiedLikes'],
          code: z.ZodIssueCode.custom,
          message: 'Verified likes cannot be greater than verified views',
        });
      }

      if (
        value.verifiedViews !== undefined &&
        value.verifiedComments !== undefined &&
        value.verifiedComments > value.verifiedViews
      ) {
        ctx.addIssue({
          path: ['verifiedComments'],
          code: z.ZodIssueCode.custom,
          message: 'Verified comments cannot be greater than verified views',
        });
      }
    }

    if (value.reviewStatus === 'REJECTED') {
      const trimmedNotes = value.reviewerNotes?.trim() ?? '';
      if (!trimmedNotes.length) {
        ctx.addIssue({
          path: ['reviewerNotes'],
          code: z.ZodIssueCode.custom,
          message: 'Add reviewer notes when rejecting a submission',
        });
      }

      if (
        value.verifiedViews !== undefined ||
        value.verifiedLikes !== undefined ||
        value.verifiedComments !== undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Verified metrics are only allowed for approved submissions',
        });
      }
    }
  });
