import assert from 'node:assert/strict';

type ApiResponse<T> = {
  status: number;
  data: T;
};

type ApiErrorPayload = {
  message?: string | string[];
};

type UserMe = {
  id: string;
  displayName: string;
};

type Campaign = {
  id: string;
  title: string;
  status: string;
  tier: string;
  minFollowers: number;
  maxFollowers?: number | null;
};

type Submission = {
  id: string;
  campaignId: string;
  userId: string;
  reviewStatus: string;
};

type Payout = {
  campaignId: string;
  status: string;
  amount: number;
};

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

function buildDevHeaders(authProviderId: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-dev-auth-provider-id': authProviderId,
    'x-dev-email': `${authProviderId}@demo.hurkme.local`,
    'x-dev-display-name': authProviderId.replaceAll('_', ' '),
  };
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH';
    authProviderId: string;
    body?: unknown;
  },
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: buildDevHeaders(options.authProviderId),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown = null;
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else if (contentType.includes('text/')) {
    payload = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload
        ? (payload as ApiErrorPayload).message
        : undefined;
    const renderedMessage = Array.isArray(message) ? message.join(', ') : message;
    throw new Error(
      `Request failed (${response.status}) ${options.method ?? 'GET'} ${path}: ${
        renderedMessage ?? 'unknown error'
      }`,
    );
  }

  return {
    status: response.status,
    data: payload as T,
  };
}

function buildOnboardingPayload(displayName: string) {
  return {
    primaryPlatform: 'INSTAGRAM',
    primaryNiche: 'BUSINESS',
    secondaryNiches: ['EDUCATION'],
    followerCount: 12_000,
    goal: 'MONETIZE',
    growthStyle: 'DAILY_STEPS',
    audienceRegion: 'AFRICA',
    audienceAgeBand: '18-34',
    country: 'NG',
    language: 'English',
    displayName,
    bio: 'Core flow e2e onboarding update',
    socialLinks: {
      instagram: 'https://instagram.com/core-flow-e2e',
    },
  };
}

async function main() {
  const creatorAuth = 'demo_creator_1';
  const adminAuth = 'demo_admin_1';

  console.log(`Running core flow e2e against ${API_BASE_URL}`);

  const creatorMe = await apiRequest<UserMe>('/me', {
    authProviderId: creatorAuth,
  });
  const adminMe = await apiRequest<UserMe>('/me', {
    authProviderId: adminAuth,
  });

  assert.ok(creatorMe.data.id, 'Creator user id is missing');
  assert.ok(adminMe.data.id, 'Admin user id is missing');
  console.log(`Creator user: ${creatorMe.data.id}`);
  console.log(`Admin user: ${adminMe.data.id}`);

  const campaigns = await apiRequest<Campaign[]>('/campaigns', {
    authProviderId: creatorAuth,
  });
  const targetCampaign = campaigns.data.find((campaign) =>
    campaign.title.includes('Hustle Hub: Creator Toolkit Launch'),
  );
  assert.ok(targetCampaign, 'Expected seeded campaign was not found');
  console.log(`Target campaign: ${targetCampaign.id} (${targetCampaign.status})`);

  await apiRequest(`/admin/campaigns`, {
    method: 'POST',
    authProviderId: adminAuth,
    body: {
      action: 'open',
      id: targetCampaign.id,
    },
  });
  console.log('Campaign status reset to OPEN for deterministic flow');

  await apiRequest('/profile/onboarding', {
    method: 'POST',
    authProviderId: creatorAuth,
    body: buildOnboardingPayload(creatorMe.data.displayName || 'E2E Creator'),
  });
  console.log('Onboarding submitted');

  await apiRequest(`/campaigns/${targetCampaign.id}/apply`, {
    method: 'POST',
    authProviderId: creatorAuth,
  });
  console.log('Applied to campaign');

  const runToken = Date.now();
  await apiRequest(`/campaigns/${targetCampaign.id}/submit`, {
    method: 'POST',
    authProviderId: creatorAuth,
    body: {
      proofLinks: [`https://example.com/proof/${runToken}`],
      proofMediaUrls: [`https://example.com/media/${runToken}.jpg`],
      claimedViews: 5_000,
      claimedLikes: 450,
      claimedComments: 40,
    },
  });
  console.log('Proof submitted');

  const submissions = await apiRequest<Submission[]>(
    `/admin/submissions?campaignId=${targetCampaign.id}`,
    {
      authProviderId: adminAuth,
    },
  );
  const targetSubmission = submissions.data.find(
    (submission) => submission.userId === creatorMe.data.id,
  );
  assert.ok(targetSubmission, 'Expected creator submission not found');
  console.log(`Submission found: ${targetSubmission.id}`);

  await apiRequest(`/admin/submissions/${targetSubmission.id}/review`, {
    method: 'POST',
    authProviderId: adminAuth,
    body: {
      reviewStatus: 'APPROVED',
      reviewerNotes: 'E2E approved',
      verifiedViews: 4_800,
      verifiedLikes: 420,
      verifiedComments: 35,
    },
  });
  console.log('Admin review approved');

  const payoutComputation = await apiRequest<{
    approvedCount: number;
    payouts: Array<{ userId: string; totalPayout: number }>;
  }>(`/admin/campaigns/${targetCampaign.id}/compute-payouts`, {
    method: 'POST',
    authProviderId: adminAuth,
  });
  assert.ok(
    payoutComputation.data.approvedCount >= 1,
    'Expected at least one approved payout',
  );
  console.log(`Payouts computed for ${payoutComputation.data.approvedCount} submission(s)`);

  const payouts = await apiRequest<Payout[]>('/payouts', {
    authProviderId: creatorAuth,
  });
  const creatorPayout = payouts.data.find(
    (row) => row.campaignId === targetCampaign.id && row.amount > 0,
  );
  assert.ok(creatorPayout, 'Expected creator payout record was not created');
  console.log(
    `Payout found: campaign=${creatorPayout.campaignId}, amount=${creatorPayout.amount}, status=${creatorPayout.status}`,
  );

  console.log('Core flow e2e passed');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Core flow e2e failed: ${message}`);
  process.exit(1);
});
