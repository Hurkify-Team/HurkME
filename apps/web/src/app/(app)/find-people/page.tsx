'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';

const initialFilters = {
  q: '',
  niche: '',
  followerTier: '',
  country: '',
  platform: '',
};

export default function FindPeoplePage() {
  const { request } = useApiClient();
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) {
          params.set(key, value);
        }
      }

      const data = await request<any[]>(`/creators/search?${params.toString()}`);
      setResults(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load creators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const interact = async (targetUserId: string, action: 'SAVE' | 'FEEDBACK' | 'COLLAB_REQUEST') => {
    try {
      await request('/interactions', {
        method: 'POST',
        json: {
          targetUserId,
          action,
        },
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send interaction');
    }
  };

  return (
    <SectionCard title="Find Your People" subtitle="Search creators by niche, tier, platform, and location.">
      <InlineError message={error} />

      <div className="grid gap-2 md:grid-cols-5">
        <input
          placeholder="Search name or bio"
          value={filters.q}
          onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
        />
        <select
          value={filters.niche}
          onChange={(event) => setFilters((prev) => ({ ...prev, niche: event.target.value }))}
        >
          <option value="">Any niche</option>
          <option value="FITNESS">Fitness</option>
          <option value="TECH">Tech</option>
          <option value="BUSINESS">Business</option>
          <option value="EDUCATION">Education</option>
          <option value="LIFESTYLE">Lifestyle</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={filters.followerTier}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, followerTier: event.target.value }))
          }
        >
          <option value="">Any tier</option>
          <option value="T1">T1</option>
          <option value="T2">T2</option>
          <option value="T3">T3</option>
        </select>
        <input
          placeholder="Country code"
          value={filters.country}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, country: event.target.value.toUpperCase() }))
          }
        />
        <select
          value={filters.platform}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, platform: event.target.value }))
          }
        >
          <option value="">Any platform</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="TIKTOK">TikTok</option>
          <option value="YOUTUBE">YouTube</option>
          <option value="X">X</option>
          <option value="LINKEDIN">LinkedIn</option>
        </select>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          className="rounded-full bg-brand-ocean px-4 py-2 text-sm text-white"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button
          className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700"
          onClick={() => {
            setFilters(initialFilters);
          }}
        >
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {results.map((creator) => (
          <article
            key={creator.id || creator.userId}
            className="rounded-xl border border-slate-200 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-brand-ink">{creator.displayName}</h3>
                <p className="text-sm text-slate-600">{creator.creatorProfile?.bio ?? 'No bio yet'}</p>
                <p className="text-xs text-brand-ocean">
                  {creator.creatorProfile?.primaryNiche} • {creator.creatorProfile?.followerTier} •{' '}
                  {creator.creatorProfile?.primaryPlatform}
                </p>
              </div>
              <Link
                href={`/creators/${creator.id ?? creator.userId}`}
                className="rounded-full border border-brand-ocean px-3 py-1 text-xs text-brand-ocean"
              >
                View profile
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-full bg-slate-100 px-3 py-1 text-xs"
                onClick={() => void interact(creator.id ?? creator.userId, 'SAVE')}
              >
                Save
              </button>
              <button
                className="rounded-full bg-slate-100 px-3 py-1 text-xs"
                onClick={() => void interact(creator.id ?? creator.userId, 'FEEDBACK')}
              >
                Send feedback
              </button>
              <button
                className="rounded-full bg-brand-mint/20 px-3 py-1 text-xs text-brand-ink"
                onClick={() => void interact(creator.id ?? creator.userId, 'COLLAB_REQUEST')}
              >
                Collab request
              </button>
            </div>
          </article>
        ))}
        {!results.length ? <p className="text-sm text-slate-500">No creators found yet.</p> : null}
      </div>
    </SectionCard>
  );
}
