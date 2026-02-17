'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import { adminReviewSchema } from '@/lib/schemas';
import type { AdminSubmission } from '@/lib/types';

type ReviewChoice = 'APPROVED' | 'REJECTED';
type SubmissionFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

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
  const [error, setError] = useState<string | null>(null);

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? null,
    [selectedId, submissions],
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

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

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
      await loadSubmissions();
      setFormError(null);
      setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export failed');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <SectionCard
        title="Admin Review Queue"
        subtitle="Review proof, approve valid work, and reject suspicious submissions."
      >
        <InlineError message={error} />
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
      </div>
    </div>
  );
}
