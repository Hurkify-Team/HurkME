import type { ReviewStatus } from '@prisma/client';

const REVIEW_APPROVED = 'APPROVED' as const;
const REVIEW_REJECTED = 'REJECTED' as const;

const MAX_REVIEWER_NOTES_LENGTH = 500;
const MAX_VERIFIED_VIEWS = 500_000_000;
const MAX_VERIFIED_LIKES = 100_000_000;
const MAX_VERIFIED_COMMENTS = 10_000_000;

type ReviewPayload = {
  reviewStatus: ReviewStatus;
  reviewerNotes?: string | null;
  verifiedViews?: number | null;
  verifiedLikes?: number | null;
  verifiedComments?: number | null;
};

type ApprovedReviewDecision = {
  reviewStatus: typeof REVIEW_APPROVED;
  reviewerNotes: string | null;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
  };
};

type RejectedReviewDecision = {
  reviewStatus: typeof REVIEW_REJECTED;
  reviewerNotes: string;
  metrics: null;
};

export type ReviewDecision = ApprovedReviewDecision | RejectedReviewDecision;

function normalizeNotes(notes?: string | null): string | null {
  if (typeof notes !== 'string') {
    return null;
  }

  const trimmed = notes.trim();
  if (!trimmed.length) {
    return null;
  }

  if (trimmed.length > MAX_REVIEWER_NOTES_LENGTH) {
    throw new Error(`Reviewer notes cannot exceed ${MAX_REVIEWER_NOTES_LENGTH} characters`);
  }

  return trimmed;
}

function parseMetric(
  value: number | null | undefined,
  fieldLabel: string,
  max: number,
): number {
  if (value === null || value === undefined) {
    throw new Error(`${fieldLabel} is required`);
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${fieldLabel} must be a whole number`);
  }

  if (value < 0) {
    throw new Error(`${fieldLabel} cannot be negative`);
  }

  if (value > max) {
    throw new Error(`${fieldLabel} cannot be greater than ${max.toLocaleString()}`);
  }

  return value;
}

export function normalizeReviewDecision(payload: ReviewPayload): ReviewDecision {
  if (payload.reviewStatus !== REVIEW_APPROVED && payload.reviewStatus !== REVIEW_REJECTED) {
    throw new Error('Review status must be APPROVED or REJECTED');
  }

  const reviewerNotes = normalizeNotes(payload.reviewerNotes);
  const hasAnyMetric =
    payload.verifiedViews !== undefined ||
    payload.verifiedLikes !== undefined ||
    payload.verifiedComments !== undefined;

  if (payload.reviewStatus === REVIEW_REJECTED) {
    if (!reviewerNotes) {
      throw new Error('Reviewer notes are required when rejecting a submission');
    }

    if (hasAnyMetric) {
      throw new Error('Verified metrics are only allowed when approving a submission');
    }

    return {
      reviewStatus: REVIEW_REJECTED,
      reviewerNotes,
      metrics: null,
    };
  }

  const verifiedViews = parseMetric(
    payload.verifiedViews,
    'Verified views',
    MAX_VERIFIED_VIEWS,
  );
  const verifiedLikes = parseMetric(
    payload.verifiedLikes,
    'Verified likes',
    MAX_VERIFIED_LIKES,
  );
  const verifiedComments =
    payload.verifiedComments === undefined || payload.verifiedComments === null
      ? 0
      : parseMetric(payload.verifiedComments, 'Verified comments', MAX_VERIFIED_COMMENTS);

  if (verifiedLikes > verifiedViews) {
    throw new Error('Verified likes cannot be greater than verified views');
  }

  if (verifiedComments > verifiedViews) {
    throw new Error('Verified comments cannot be greater than verified views');
  }

  return {
    reviewStatus: REVIEW_APPROVED,
    reviewerNotes,
    metrics: {
      views: verifiedViews,
      likes: verifiedLikes,
      comments: verifiedComments,
      engagementRate: (verifiedLikes + verifiedComments) / Math.max(1, verifiedViews),
    },
  };
}
