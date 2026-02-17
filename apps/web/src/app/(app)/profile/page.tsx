'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';

export default function ProfilePage() {
  const { request } = useApiClient();
  const [me, setMe] = useState<any>(null);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, streakRes] = await Promise.all([
          request<any>('/me'),
          request<{ currentStreak: number; longestStreak: number }>('/streaks'),
        ]);
        setMe(meRes);
        setStreak(streakRes);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load profile');
      }
    };

    void load();
  }, [request]);

  const growthScore = useMemo(() => {
    return Math.min(100, 30 + (streak?.currentStreak ?? 0) * 8);
  }, [streak]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <SectionCard title="Profile" subtitle="Creator DNA + growth snapshot">
        <InlineError message={error} />
        {me ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-lg font-semibold text-brand-ink">{me.displayName}</p>
              <p className="text-sm text-slate-600">{me.email}</p>
              <p className="mt-2 text-sm text-slate-700">{me.creatorProfile?.bio ?? 'No bio yet'}</p>
            </div>

            {me.creatorProfile ? (
              <div className="rounded-xl border border-slate-200 p-3 text-sm">
                <p>
                  Platform: <span className="font-semibold">{me.creatorProfile.primaryPlatform}</span>
                </p>
                <p>
                  Primary niche: <span className="font-semibold">{me.creatorProfile.primaryNiche}</span>
                </p>
                <p>
                  Followers: <span className="font-semibold">{me.creatorProfile.followerCount}</span> (
                  {me.creatorProfile.followerTier})
                </p>
                <p>
                  Goal: <span className="font-semibold">{me.creatorProfile.goal}</span>
                </p>
                <p>
                  Growth style: <span className="font-semibold">{me.creatorProfile.growthStyle}</span>
                </p>
                <p>
                  Region: <span className="font-semibold">{me.creatorProfile.audienceRegion}</span>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Complete onboarding to unlock your Creator DNA summary.
                <Link href="/onboarding" className="ml-1 underline">
                  Start now
                </Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading profile...</p>
        )}
      </SectionCard>

      <SectionCard title="Performance" subtitle="Streak and reputation indicators">
        <div className="rounded-xl bg-brand-cream p-4">
          <p className="text-sm text-brand-ocean">Growth score</p>
          <p className="text-3xl font-semibold text-brand-ink">{growthScore}</p>
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          Current streak: <span className="font-semibold">{streak?.currentStreak ?? 0}</span>
          <br />
          Best streak: <span className="font-semibold">{streak?.longestStreak ?? 0}</span>
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          Campaign rating will show after your first approved paid jobs.
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          Saved creators list will be expanded in next iteration.
        </div>
      </SectionCard>
    </div>
  );
}
