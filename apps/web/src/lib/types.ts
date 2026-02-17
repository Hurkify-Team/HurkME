export type FeedItem = {
  type: 'match' | 'rising' | 'discover';
  reason: string;
  creator: {
    id: string;
    displayName: string;
    username?: string | null;
    creatorProfile: {
      primaryNiche: string;
      secondaryNiches: string[];
      followerTier: string;
      primaryPlatform: string;
      country?: string | null;
      language?: string | null;
      bio?: string | null;
      photoUrl?: string | null;
      growthStyle?: string;
      followerCount?: number;
    };
    streak?: {
      currentStreak: number;
    } | null;
  };
};

export type UserDailyStep = {
  id: string;
  status: 'ASSIGNED' | 'COMPLETED' | 'SKIPPED';
  evidenceUrl?: string | null;
  completedAt?: string | null;
  dailyStep: {
    id: string;
    title: string;
    description: string;
    rewardPoints: number;
    type: string;
    difficulty: number;
  };
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  platform: string;
  nicheTarget: string;
  tier: string;
  minFollowers: number;
  maxFollowers?: number | null;
  requiredDeliverables: Record<string, unknown>;
  startDate: string;
  endDate: string;
  budgetTotal: number;
  platformFeePct: number;
  payoutModel: string;
  status: string;
  myApplicationStatus?: string | null;
  mySubmissionStatus?: string | null;
};

export type WalletResponse = {
  balance: number;
  pending: number;
  payoutSummary: {
    paid: number;
    pending: number;
    totalPayouts: number;
  };
  ledger: Array<{
    id: string;
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    reason: string;
    createdAt: string;
  }>;
};

export type AdminSubmission = {
  id: string;
  campaignId: string;
  userId: string;
  proofLinks: string[];
  proofMediaUrls: string[];
  claimedViews: number;
  claimedLikes: number;
  claimedComments?: number | null;
  submittedAt: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerNotes?: string | null;
  campaign?: {
    id: string;
    title: string;
    status: string;
  } | null;
  user?: {
    id: string;
    displayName: string;
    email: string;
  } | null;
};
