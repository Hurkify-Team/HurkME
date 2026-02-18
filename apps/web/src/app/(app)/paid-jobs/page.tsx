'use client';

import { useEffect, useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import { formatNaira, titleCase } from '@/lib/format';
import { proofSubmissionSchema } from '@/lib/schemas';
import type { Campaign } from '@/lib/types';

type CampaignFilter = 'ALL' | 'OPEN' | 'APPLIED' | 'SUBMITTED';

function parseLines(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function toTone(value: string | null | undefined): string {
  const normalized = (value ?? '').toUpperCase();

  if (
    normalized === 'OPEN' ||
    normalized === 'APPLIED' ||
    normalized === 'APPROVED' ||
    normalized === 'PAID'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (normalized === 'REJECTED' || normalized === 'DISQUALIFIED') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (
    normalized === 'PENDING' ||
    normalized === 'INVITED' ||
    normalized === 'ACCEPTED' ||
    normalized === 'COMPLETED'
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function canApply(campaign: Campaign): boolean {
  if (campaign.status !== 'OPEN') {
    return false;
  }

  const myStatus = (campaign.myApplicationStatus ?? '').toUpperCase();
  if (['APPLIED', 'INVITED', 'ACCEPTED', 'COMPLETED', 'DISQUALIFIED'].includes(myStatus)) {
    return false;
  }

  return true;
}

export default function PaidJobsPage() {
  const { request } = useApiClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('ALL');
  const [proofLinksText, setProofLinksText] = useState('');
  const [proofMediaText, setProofMediaText] = useState('');
  const [claimedViews, setClaimedViews] = useState('0');
  const [claimedLikes, setClaimedLikes] = useState('0');
  const [claimedComments, setClaimedComments] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === 'OPEN') {
      return campaigns.filter((campaign) => campaign.status === 'OPEN');
    }
    if (campaignFilter === 'APPLIED') {
      return campaigns.filter((campaign) =>
        ['APPLIED', 'INVITED', 'ACCEPTED'].includes(
          (campaign.myApplicationStatus ?? '').toUpperCase(),
        ),
      );
    }
    if (campaignFilter === 'SUBMITTED') {
      return campaigns.filter((campaign) => campaign.mySubmissionStatus !== null);
    }

    return campaigns;
  }, [campaignFilter, campaigns]);

  useEffect(() => {
    setSelectedId((currentId) => {
      if (currentId && filteredCampaigns.some((campaign) => campaign.id === currentId)) {
        return currentId;
      }
      return filteredCampaigns[0]?.id ?? '';
    });
  }, [filteredCampaigns]);

  const selectedCampaign = useMemo(
    () => filteredCampaigns.find((campaign) => campaign.id === selectedId) ?? null,
    [filteredCampaigns, selectedId],
  );

  const proofLinks = useMemo(() => parseLines(proofLinksText), [proofLinksText]);
  const proofMediaUrls = useMemo(() => parseLines(proofMediaText), [proofMediaText]);

  const loadCampaigns = async () => {
    try {
      const data = await request<Campaign[]>('/campaigns');
      setCampaigns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load paid jobs');
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  const apply = async (campaignId: string) => {
    try {
      await request(`/campaigns/${campaignId}/apply`, { method: 'POST' });
      await loadCampaigns();
      setSuccess('Application sent. You can submit proof once your content is live.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    }
  };

  const uploadScreenshot = async (file: File) => {
    try {
      setUploading(true);
      const presign = await request<{
        uploadUrl: string;
        publicUrl: string;
        mocked: boolean;
      }>('/uploads/presign', {
        method: 'POST',
        json: {
          fileName: file.name,
          contentType: file.type,
        },
      });

      if (!presign.mocked) {
        await fetch(presign.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
      }

      setProofMediaText((prev) => (prev ? `${prev}\n${presign.publicUrl}` : presign.publicUrl));
      setError(null);
      setSuccess('Screenshot uploaded. You can submit now.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screenshot upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submitProof = async () => {
    if (!selectedCampaign) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        proofLinks,
        proofMediaUrls,
        claimedViews: Number(claimedViews),
        claimedLikes: Number(claimedLikes),
        claimedComments: Number(claimedComments),
      };

      const parsed = proofSubmissionSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Invalid proof submission payload');
        return;
      }

      await request(`/campaigns/${selectedCampaign.id}/submit`, {
        method: 'POST',
        json: parsed.data,
      });

      await loadCampaigns();
      setSuccess('Proof submitted. Admin review will update your status soon.');
      setError(null);
      setProofLinksText('');
      setProofMediaText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proof submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <SectionCard title="Paid Jobs" subtitle="Apply for legit brand work based on real performance.">
        <InlineError message={error} />
        {success ? (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-2">
          {(['ALL', 'OPEN', 'APPLIED', 'SUBMITTED'] as CampaignFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCampaignFilter(value)}
              className={`rounded-full border px-3 py-1 text-xs ${
                campaignFilter === value
                  ? 'border-brand-ocean bg-brand-ocean text-white'
                  : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const applyEnabled = canApply(campaign);
            return (
              <article
                key={campaign.id}
                className={`cursor-pointer rounded-xl border p-3 ${
                  selectedId === campaign.id
                    ? 'border-brand-ocean bg-brand-cream/60'
                    : 'border-slate-200 bg-white'
                }`}
                onClick={() => setSelectedId(campaign.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-brand-ink">{campaign.title}</h3>
                    <p className="text-sm text-slate-600">{campaign.description}</p>
                    <p className="mt-1 text-xs text-brand-ocean">
                      {campaign.nicheTarget} • {campaign.tier} • {campaign.platform}
                    </p>
                    <p className="text-xs text-slate-600">
                      Budget: {formatNaira(campaign.budgetTotal)} • Fee: {campaign.platformFeePct}%
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-xs ${toTone(campaign.status)}`}>
                    {titleCase(campaign.status)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full border px-2 py-1 ${toTone(campaign.myApplicationStatus)}`}>
                    App: {campaign.myApplicationStatus ?? 'none'}
                  </span>
                  <span className={`rounded-full border px-2 py-1 ${toTone(campaign.mySubmissionStatus)}`}>
                    Submission: {campaign.mySubmissionStatus ?? 'none'}
                  </span>
                </div>
                <button
                  className="mt-3 rounded-full bg-brand-ocean px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!applyEnabled}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (applyEnabled) {
                      void apply(campaign.id);
                    }
                  }}
                  type="button"
                >
                  {applyEnabled ? 'Apply' : 'Applied'}
                </button>
              </article>
            );
          })}
          {!filteredCampaigns.length ? (
            <p className="text-sm text-slate-500">No paid jobs for this filter yet.</p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Submit Proof" subtitle="Post links + screenshots for review and payout.">
        {selectedCampaign ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-brand-ink">{selectedCampaign.title}</p>
              <p className="mt-1 text-xs text-slate-600">Deliverables</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-700">
                {Object.entries(selectedCampaign.requiredDeliverables).map(([key, value]) => (
                  <li key={key}>
                    {key}: {String(value)}
                  </li>
                ))}
              </ul>
            </div>

            <textarea
              rows={3}
              placeholder="Proof links (one per line)"
              value={proofLinksText}
              onChange={(event) => setProofLinksText(event.target.value)}
            />

            <textarea
              rows={3}
              placeholder="Proof media URLs (one per line)"
              value={proofMediaText}
              onChange={(event) => setProofMediaText(event.target.value)}
            />

            <label className="block text-sm text-slate-700">
              Upload screenshot
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadScreenshot(file);
                  }
                }}
              />
            </label>
            {uploading ? <p className="text-xs text-slate-500">Uploading screenshot...</p> : null}

            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={0}
                value={claimedViews}
                onChange={(event) => setClaimedViews(event.target.value)}
                placeholder="Views"
              />
              <input
                type="number"
                min={0}
                value={claimedLikes}
                onChange={(event) => setClaimedLikes(event.target.value)}
                placeholder="Likes"
              />
              <input
                type="number"
                min={0}
                value={claimedComments}
                onChange={(event) => setClaimedComments(event.target.value)}
                placeholder="Comments"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p>Proof links added: {proofLinks.length}</p>
              <p>Screenshot URLs added: {proofMediaUrls.length}</p>
              <p className="mt-1">Admin will review proof before payout is computed.</p>
            </div>

            <button
              className="rounded-full bg-brand-ocean px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void submitProof()}
              disabled={submitting}
              type="button"
            >
              {submitting ? 'Submitting...' : 'Submit proof'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Pick a campaign from the left to submit proof.</p>
        )}
      </SectionCard>
    </div>
  );
}
