'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import { formatNaira, titleCase } from '@/lib/format';
import { adminReviewSchema } from '@/lib/schemas';
import type { AdminCampaign, AdminSubmission } from '@/lib/types';

type ReviewChoice = 'APPROVED' | 'REJECTED';
type SubmissionFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type CampaignFilter = 'ALL' | 'DRAFT' | 'OPEN' | 'CLOSED' | 'IN_REVIEW' | 'PAID_OUT';

type InviteCandidate = {
  id: string;
  userId?: string;
  displayName: string;
  creatorProfile?: {
    primaryNiche?: string;
    followerTier?: string;
    primaryPlatform?: string;
  };
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  adminUser?: {
    displayName: string;
  } | null;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function parseOptionalInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return undefined;
  }

  return Number(trimmed);
}

function statusPillClass(status: SubmissionFilter): string {
  if (status === 'APPROVED') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  if (status === 'REJECTED') {
    return 'bg-rose-100 text-rose-700 border-rose-200';
  }

  if (status === 'PENDING') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function campaignPillClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === 'OPEN' || normalized === 'PAID_OUT') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  if (normalized === 'DRAFT' || normalized === 'IN_REVIEW') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (normalized === 'CLOSED') {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatSubmittedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString();
}

export default function AdminPage() {
  const { request } = useApiClient();
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<ReviewChoice>('APPROVED');
  const [verifiedViews, setVerifiedViews] = useState('');
  const [verifiedLikes, setVerifiedLikes] = useState('');
  const [verifiedComments, setVerifiedComments] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionFilter>('PENDING');
  const [computeCampaignId, setComputeCampaignId] = useState('');
  const [computeOutput, setComputeOutput] = useState<any>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('ALL');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignActionLoading, setCampaignActionLoading] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [nicheTarget, setNicheTarget] = useState('BUSINESS');
  const [tier, setTier] = useState('T1');
  const [minFollowers, setMinFollowers] = useState('1000');
  const [maxFollowers, setMaxFollowers] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetNaira, setBudgetNaira] = useState('50000');
  const [platformFeePct, setPlatformFeePct] = useState('15');
  const [payoutModel, setPayoutModel] = useState('BASE_BONUS');
  const [deliverablesJson, setDeliverablesJson] = useState(
    '{"posts":1,"story":1,"hashtag":"#HurkME"}',
  );
  const [weightsJson, setWeightsJson] = useState(
    '{"views":0.4,"likes":0.25,"comments":0.2,"engagementRate":0.15}',
  );

  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteCandidates, setInviteCandidates] = useState<InviteCandidate[]>([]);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? null,
    [selectedId, submissions],
  );

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const proofLinks = useMemo(
    () => asStringArray(selectedSubmission?.proofLinks),
    [selectedSubmission?.proofLinks],
  );
  const proofMediaUrls = useMemo(
    () => asStringArray(selectedSubmission?.proofMediaUrls),
    [selectedSubmission?.proofMediaUrls],
  );

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const query = statusFilter === 'ALL' ? '' : `?reviewStatus=${statusFilter}`;
      const data = await request<AdminSubmission[]>(`/admin/submissions${query}`);
      setSubmissions(data);
      setSelectedId((currentId) => {
        if (currentId && data.some((submission) => submission.id === currentId)) {
          return currentId;
        }
        return data[0]?.id ?? '';
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [request, statusFilter]);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const query = campaignFilter === 'ALL' ? '' : `?status=${campaignFilter}`;
      const data = await request<AdminCampaign[]>(`/admin/campaigns${query}`);
      setCampaigns(data);
      setSelectedCampaignId((currentId) => {
        if (currentId && data.some((campaign) => campaign.id === currentId)) {
          return currentId;
        }
        return data[0]?.id ?? '';
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  }, [request, campaignFilter]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const data = await request<AuditLog[]>('/admin/audit-logs?limit=25');
      setAuditLogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audit logs');
    }
  }, [request]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  useEffect(() => {
    if (!selectedSubmission) {
      return;
    }

    setReviewStatus(selectedSubmission.reviewStatus === 'REJECTED' ? 'REJECTED' : 'APPROVED');
    setVerifiedViews(String(selectedSubmission.claimedViews ?? 0));
    setVerifiedLikes(String(selectedSubmission.claimedLikes ?? 0));
    setVerifiedComments(String(selectedSubmission.claimedComments ?? 0));
    setNotes(selectedSubmission.reviewerNotes ?? '');
    setComputeCampaignId(selectedSubmission.campaignId);
    setFormError(null);
  }, [selectedSubmission]);

  useEffect(() => {
    if (!selectedCampaign) {
      return;
    }

    setComputeCampaignId(selectedCampaign.id);
  }, [selectedCampaign]);

  const review = async () => {
    if (!selectedSubmission) {
      return;
    }

    const payload = {
      reviewStatus,
      reviewerNotes: notes.trim() || undefined,
      ...(reviewStatus === 'APPROVED'
        ? {
            verifiedViews: parseOptionalInteger(verifiedViews),
            verifiedLikes: parseOptionalInteger(verifiedLikes),
            verifiedComments: parseOptionalInteger(verifiedComments),
          }
        : {}),
    };

    const parsed = adminReviewSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Invalid review payload');
      return;
    }

    try {
      setReviewSaving(true);
      await request(`/admin/submissions/${selectedSubmission.id}/review`, {
        method: 'POST',
        json: parsed.data,
      });
      await Promise.all([loadSubmissions(), loadAuditLogs()]);
      setFormError(null);
      setError(null);
      setSuccess('Review saved successfully.');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Review update failed');
    } finally {
      setReviewSaving(false);
    }
  };

  const computePayouts = async () => {
    if (!computeCampaignId) {
      return;
    }

    try {
      const result = await request(`/admin/campaigns/${computeCampaignId}/compute-payouts`, {
        method: 'POST',
      });
      setComputeOutput(result);
      setError(null);
      setSuccess('Payouts computed.');
      await Promise.all([loadCampaigns(), loadAuditLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout computation failed');
    }
  };

  const exportCsv = async () => {
    if (!computeCampaignId) {
      return;
    }

    try {
      const csv = await request<string>(`/admin/campaigns/${computeCampaignId}/payout-report`);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `campaign-${computeCampaignId}-payout-report.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setError(null);
      setSuccess('CSV exported.');
      await loadAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export failed');
    }
  };

  const createCampaign = async () => {
    try {
      setCreatingCampaign(true);
      const parsedDeliverables = JSON.parse(deliverablesJson) as Record<string, unknown>;
      const parsedWeights = weightsJson.trim().length
        ? (JSON.parse(weightsJson) as Record<string, number>)
        : undefined;

      const budgetTotal = Math.round(Number(budgetNaira) * 100);
      if (!Number.isFinite(budgetTotal) || budgetTotal < 10_000) {
        setError('Budget must be at least ₦100.');
        return;
      }

      await request('/admin/campaigns', {
        method: 'POST',
        json: {
          action: 'create',
          title: title.trim(),
          description: description.trim(),
          platform,
          nicheTarget,
          tier,
          minFollowers: Number(minFollowers),
          maxFollowers: maxFollowers.trim() ? Number(maxFollowers) : undefined,
          requiredDeliverables: parsedDeliverables,
          performanceWeights: parsedWeights,
          startDate,
          endDate,
          budgetTotal,
          platformFeePct: Number(platformFeePct),
          payoutModel,
          status: 'DRAFT',
        },
      });

      setSuccess('Campaign created.');
      setError(null);
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      await Promise.all([loadCampaigns(), loadAuditLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Campaign creation failed');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, action: 'open' | 'close') => {
    try {
      setCampaignActionLoading(`${action}:${campaignId}`);
      await request('/admin/campaigns', {
        method: 'POST',
        json: {
          action,
          id: campaignId,
        },
      });
      setSuccess(`Campaign ${action === 'open' ? 'opened' : 'closed'}.`);
      setError(null);
      await Promise.all([loadCampaigns(), loadAuditLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Campaign status update failed');
    } finally {
      setCampaignActionLoading(null);
    }
  };

  const searchCandidates = async () => {
    try {
      if (!inviteQuery.trim()) {
        setInviteCandidates([]);
        return;
      }

      const data = await request<InviteCandidate[]>(
        `/creators/search?q=${encodeURIComponent(inviteQuery.trim())}`,
      );
      setInviteCandidates(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not search creators');
    }
  };

  const inviteCreator = async (userId: string) => {
    if (!selectedCampaign) {
      setError('Select a campaign first.');
      return;
    }

    try {
      setInviteLoading(true);
      await request(`/admin/campaigns/${selectedCampaign.id}/invite`, {
        method: 'POST',
        json: {
          userId,
        },
      });
      setSuccess('Creator invited successfully.');
      setError(null);
      setInviteUserId('');
      await Promise.all([loadCampaigns(), loadAuditLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <InlineError message={error} />
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard
          title="Campaign Control"
          subtitle="Create paid jobs, open/close campaigns, and monitor capacity."
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {(['ALL', 'DRAFT', 'OPEN', 'CLOSED', 'IN_REVIEW', 'PAID_OUT'] as CampaignFilter[]).map(
              (filter) => (
                <button
                  key={filter}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    filter === campaignFilter
                      ? 'border-brand-ocean bg-brand-ocean text-white'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                  onClick={() => setCampaignFilter(filter)}
                >
                  {filter}
                </button>
              ),
            )}
          </div>

          {loadingCampaigns ? <p className="text-sm text-slate-500">Loading campaigns...</p> : null}
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className={`cursor-pointer rounded-xl border p-3 ${
                  selectedCampaignId === campaign.id
                    ? 'border-brand-ocean bg-brand-cream/70'
                    : 'border-slate-200 bg-white'
                }`}
                onClick={() => setSelectedCampaignId(campaign.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-ink">{campaign.title}</p>
                    <p className="text-xs text-slate-600">
                      {campaign.organization?.name} • {campaign.platform} • {campaign.tier}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatNaira(campaign.budgetTotal)} • {titleCase(campaign.payoutModel)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${campaignPillClass(
                      campaign.status,
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  Applications: {campaign._count?.applications ?? 0} • Submissions:{' '}
                  {campaign._count?.submissions ?? 0} • Payouts: {campaign._count?.payouts ?? 0}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-brand-mint px-3 py-1 text-xs text-brand-ink disabled:opacity-60"
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateCampaignStatus(campaign.id, 'open');
                    }}
                    disabled={campaignActionLoading === `open:${campaign.id}`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateCampaignStatus(campaign.id, 'close');
                    }}
                    disabled={campaignActionLoading === `close:${campaign.id}`}
                  >
                    Close
                  </button>
                </div>
              </article>
            ))}
            {!campaigns.length ? <p className="text-sm text-slate-500">No campaigns found.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Create Campaign" subtitle="Quickly draft a new Paid Job.">
          <div className="grid gap-2">
            <input placeholder="Campaign title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <textarea
              rows={3}
              placeholder="Campaign description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="X">X</option>
                <option value="LINKEDIN">LinkedIn</option>
              </select>
              <select value={nicheTarget} onChange={(event) => setNicheTarget(event.target.value)}>
                <option value="FITNESS">Fitness</option>
                <option value="TECH">Tech</option>
                <option value="FASHION">Fashion</option>
                <option value="MUSIC">Music</option>
                <option value="BUSINESS">Business</option>
                <option value="EDUCATION">Education</option>
                <option value="LIFESTYLE">Lifestyle</option>
                <option value="COMEDY">Comedy</option>
                <option value="GAMING">Gaming</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select value={tier} onChange={(event) => setTier(event.target.value)}>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
              </select>
              <select value={payoutModel} onChange={(event) => setPayoutModel(event.target.value)}>
                <option value="BASE_BONUS">Base + Bonus</option>
                <option value="PERFORMANCE_ONLY">Performance Only</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1000}
                placeholder="Min followers"
                value={minFollowers}
                onChange={(event) => setMinFollowers(event.target.value)}
              />
              <input
                type="number"
                min={1000}
                placeholder="Max followers (optional)"
                value={maxFollowers}
                onChange={(event) => setMaxFollowers(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={100}
                placeholder="Budget (NGN)"
                value={budgetNaira}
                onChange={(event) => setBudgetNaira(event.target.value)}
              />
              <input
                type="number"
                min={0}
                max={60}
                placeholder="Platform fee %"
                value={platformFeePct}
                onChange={(event) => setPlatformFeePct(event.target.value)}
              />
            </div>

            <textarea
              rows={3}
              value={deliverablesJson}
              onChange={(event) => setDeliverablesJson(event.target.value)}
              placeholder='Deliverables JSON e.g. {"posts":1}'
            />
            <textarea
              rows={2}
              value={weightsJson}
              onChange={(event) => setWeightsJson(event.target.value)}
              placeholder='Performance weights JSON e.g. {"views":0.4,"likes":0.25,"comments":0.2,"engagementRate":0.15}'
            />

            <button
              type="button"
              className="rounded-full bg-brand-ocean px-4 py-2 text-sm text-white disabled:opacity-60"
              onClick={() => void createCampaign()}
              disabled={creatingCampaign}
            >
              {creatingCampaign ? 'Creating...' : 'Create campaign'}
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard
          title="Admin Review Queue"
          subtitle="Review proof, approve valid work, and reject suspicious submissions."
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as SubmissionFilter[]).map((filter) => (
              <button
                key={filter}
                className={`rounded-full border px-3 py-1 text-xs ${
                  filter === statusFilter
                    ? 'border-brand-ocean bg-brand-ocean text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {loadingSubmissions ? <p className="text-sm text-slate-500">Loading submissions...</p> : null}
            {submissions.map((submission) => (
              <article
                key={submission.id}
                className={`cursor-pointer rounded-xl border p-3 transition ${
                  selectedId === submission.id
                    ? 'border-brand-ocean bg-brand-cream/70'
                    : 'border-slate-200 bg-white'
                }`}
                onClick={() => {
                  setSelectedId(submission.id);
                  setComputeCampaignId(submission.campaignId);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-ink">{submission.campaign?.title}</p>
                    <p className="text-sm text-slate-600">Creator: {submission.user?.displayName}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(
                      submission.reviewStatus,
                    )}`}
                  >
                    {submission.reviewStatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted: {formatSubmittedAt(submission.submittedAt)}
                </p>
              </article>
            ))}
            {!submissions.length ? <p className="text-sm text-slate-500">No submissions yet.</p> : null}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Review Decision" subtitle="Set final status and verified metrics.">
            {selectedSubmission ? (
              <div className="space-y-3 text-sm">
                <InlineError message={formError} />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p>
                    Reviewing: <span className="font-semibold">{selectedSubmission.user?.displayName}</span>
                  </p>
                  <p className="text-slate-600">{selectedSubmission.user?.email}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Claimed metrics: {selectedSubmission.claimedViews} views, {selectedSubmission.claimedLikes}{' '}
                    likes, {selectedSubmission.claimedComments ?? 0} comments
                  </p>
                </div>

                <label>
                  Decision
                  <select
                    value={reviewStatus}
                    onChange={(event) => setReviewStatus(event.target.value as ReviewChoice)}
                  >
                    <option value="APPROVED">Approve</option>
                    <option value="REJECTED">Reject</option>
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    type="number"
                    min={0}
                    value={verifiedViews}
                    onChange={(event) => setVerifiedViews(event.target.value)}
                    placeholder="Verified views"
                    disabled={reviewStatus === 'REJECTED'}
                  />
                  <input
                    type="number"
                    min={0}
                    value={verifiedLikes}
                    onChange={(event) => setVerifiedLikes(event.target.value)}
                    placeholder="Verified likes"
                    disabled={reviewStatus === 'REJECTED'}
                  />
                  <input
                    type="number"
                    min={0}
                    value={verifiedComments}
                    onChange={(event) => setVerifiedComments(event.target.value)}
                    placeholder="Verified comments"
                    disabled={reviewStatus === 'REJECTED'}
                  />
                </div>

                <textarea
                  rows={3}
                  placeholder={
                    reviewStatus === 'REJECTED'
                      ? 'Add reason for rejection'
                      : 'Optional reviewer note'
                  }
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />

                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proof links</p>
                  {proofLinks.length ? (
                    <ul className="space-y-1 text-xs text-brand-ocean">
                      {proofLinks.map((link) => (
                        <li key={link} className="truncate">
                          <a href={link} target="_blank" rel="noreferrer" className="underline">
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">No proof links.</p>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Screenshot URLs
                  </p>
                  {proofMediaUrls.length ? (
                    <ul className="space-y-1 text-xs text-brand-ocean">
                      {proofMediaUrls.map((url) => (
                        <li key={url} className="truncate">
                          <a href={url} target="_blank" rel="noreferrer" className="underline">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">No screenshot URLs.</p>
                  )}
                </div>

                <button
                  className="rounded-full bg-brand-ocean px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void review()}
                  disabled={reviewSaving}
                >
                  {reviewSaving ? 'Saving...' : 'Save review decision'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a submission to review.</p>
            )}
          </SectionCard>

          <SectionCard title="Invite Creators" subtitle="Search and invite eligible creators to selected campaign.">
            {selectedCampaign ? (
              <p className="mb-2 text-xs text-slate-600">
                Selected campaign: <span className="font-semibold">{selectedCampaign.title}</span>
              </p>
            ) : (
              <p className="mb-2 text-xs text-slate-600">Pick a campaign to invite creators.</p>
            )}

            <div className="flex gap-2">
              <input
                placeholder="Search creator name"
                value={inviteQuery}
                onChange={(event) => setInviteQuery(event.target.value)}
              />
              <button
                type="button"
                className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                onClick={() => void searchCandidates()}
              >
                Search
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {inviteCandidates.map((candidate, index) => (
                <div
                  key={candidate.id ?? candidate.userId ?? `candidate-${index}`}
                  className="rounded-lg border border-slate-200 p-2 text-xs"
                >
                  <p className="font-semibold text-brand-ink">{candidate.displayName}</p>
                  <p className="text-slate-600">
                    {candidate.creatorProfile?.primaryNiche} • {candidate.creatorProfile?.followerTier} •{' '}
                    {candidate.creatorProfile?.primaryPlatform}
                  </p>
                  <button
                    type="button"
                    className="mt-2 rounded-full bg-brand-mint px-3 py-1 text-xs text-brand-ink"
                    onClick={() => void inviteCreator(candidate.id ?? candidate.userId ?? '')}
                    disabled={inviteLoading || !(candidate.id ?? candidate.userId)}
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="mb-1 text-xs text-slate-600">Or invite directly with user ID</p>
              <div className="flex gap-2">
                <input
                  placeholder="User UUID"
                  value={inviteUserId}
                  onChange={(event) => setInviteUserId(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded-full bg-brand-ocean px-3 py-1 text-xs text-white disabled:opacity-60"
                  onClick={() => void inviteCreator(inviteUserId.trim())}
                  disabled={inviteLoading || !inviteUserId.trim()}
                >
                  {inviteLoading ? 'Inviting...' : 'Invite'}
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <SectionCard title="Payout Tools" subtitle="Compute payout pool and export CSV report.">
          <label>
            Campaign ID
            <input
              value={computeCampaignId}
              onChange={(event) => setComputeCampaignId(event.target.value)}
              placeholder="campaign uuid"
            />
          </label>

          <div className="mt-3 flex gap-2">
            <button
              className="rounded-full bg-brand-mint px-4 py-2 text-sm text-brand-ink"
              onClick={() => void computePayouts()}
            >
              Compute payouts
            </button>
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm"
              onClick={() => void exportCsv()}
            >
              Export CSV
            </button>
          </div>

          {computeOutput ? (
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(computeOutput, null, 2)}
            </pre>
          ) : null}
        </SectionCard>

        <SectionCard title="Audit Trail" subtitle="Recent admin actions for compliance and dispute handling.">
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                <p className="font-semibold text-brand-ink">
                  {log.action} • {log.entityType}
                </p>
                <p className="text-slate-600">
                  {log.adminUser?.displayName ?? 'Admin'} • {formatSubmittedAt(log.createdAt)}
                </p>
                {log.entityId ? <p className="text-slate-500">Ref: {log.entityId}</p> : null}
              </div>
            ))}
            {!auditLogs.length ? <p className="text-sm text-slate-500">No audit logs yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
