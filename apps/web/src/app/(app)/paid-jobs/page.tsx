'use client';

import { useEffect, useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import { formatNaira, titleCase } from '@/lib/format';
import { proofSubmissionSchema } from '@/lib/schemas';
import type { Campaign } from '@/lib/types';

function parseLines(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function PaidJobsPage() {
  const { request } = useApiClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [proofLinksText, setProofLinksText] = useState('');
  const [proofMediaText, setProofMediaText] = useState('');
  const [claimedViews, setClaimedViews] = useState('0');
  const [claimedLikes, setClaimedLikes] = useState('0');
  const [claimedComments, setClaimedComments] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  const loadCampaigns = async () => {
    try {
      const data = await request<Campaign[]>('/campaigns');
      setCampaigns(data);
      if (!selectedId && data.length) {
        setSelectedId(data[0].id);
      }
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
      const payload = {
        proofLinks: parseLines(proofLinksText),
        proofMediaUrls: parseLines(proofMediaText),
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
        json: payload,
      });

      await loadCampaigns();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proof submission failed');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <SectionCard title="Paid Jobs" subtitle="Apply for legit brand work based on real performance.">
        <InlineError message={error} />
        <div className="space-y-3">
          {campaigns.map((campaign) => (
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
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {titleCase(campaign.status)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  App: {campaign.myApplicationStatus ?? 'none'}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  Submission: {campaign.mySubmissionStatus ?? 'none'}
                </span>
              </div>
              <button
                className="mt-3 rounded-full bg-brand-ocean px-3 py-1 text-xs text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  void apply(campaign.id);
                }}
              >
                Apply
              </button>
            </article>
          ))}
          {!campaigns.length ? <p className="text-sm text-slate-500">No paid jobs yet.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Submit Proof" subtitle="Post links + screenshots for review and payout.">
        {selectedCampaign ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-brand-ink">{selectedCampaign.title}</p>
              <p className="text-slate-600">
                Deliverables: {JSON.stringify(selectedCampaign.requiredDeliverables)}
              </p>
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

            <button
              className="rounded-full bg-brand-ocean px-4 py-2 text-sm text-white"
              onClick={() => void submitProof()}
            >
              Submit proof
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Pick a campaign from the left to submit proof.</p>
        )}
      </SectionCard>
    </div>
  );
}
