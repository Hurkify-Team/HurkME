'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import type { FeedItem, UserDailyStep } from '@/lib/types';

export default function HomePage() {
  const { request } = useApiClient();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [todaySteps, setTodaySteps] = useState<UserDailyStep[]>([]);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(
    null,
  );
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [feedRes, stepsRes, streakRes, meRes] = await Promise.all([
          request<FeedItem[]>('/feed'),
          request<UserDailyStep[]>('/daily-steps/today'),
          request<{ currentStreak: number; longestStreak: number }>('/streaks'),
          request<any>('/me'),
        ]);

        if (cancelled) {
          return;
        }

        setFeed(feedRes);
        setTodaySteps(stepsRes);
        setStreak(streakRes);
        setMe(meRes);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load Home');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const completedCount = useMemo(
    () => todaySteps.filter((step) => step.status === 'COMPLETED').length,
    [todaySteps],
  );

  const growthScore = useMemo(() => {
    const streakScore = (streak?.currentStreak ?? 0) * 8;
    const stepScore = completedCount * 10;
    return Math.min(100, streakScore + stepScore + 20);
  }, [streak, completedCount]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <SectionCard
        title="Your Home"
        subtitle="Personalized discovery feed + Today’s Steps + growth score"
      >
        <InlineError message={error} />
        {loading ? (
          <p className="text-sm text-slate-600">Loading your Home...</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-cream p-4">
              <p className="text-sm text-brand-ocean">Growth score</p>
              <p className="text-3xl font-semibold text-brand-ink">{growthScore}</p>
              <p className="text-xs text-slate-600">
                Based on streak and completed Daily Steps.
              </p>
            </div>

            {!me?.creatorProfile ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Complete onboarding in under 90 seconds to unlock smarter recommendations.
                <Link href="/onboarding" className="ml-2 font-semibold underline">
                  Start onboarding
                </Link>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-ocean/75">
                Find Your People picks
              </h3>
              <div className="mt-2 space-y-2">
                {feed.slice(0, 8).map((item) => (
                  <div
                    key={`${item.type}-${item.creator.id}`}
                    className="flex items-start justify-between rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-brand-ink">{item.creator.displayName}</p>
                      <p className="text-xs text-slate-600">
                        {item.creator.creatorProfile.primaryNiche} • {item.creator.creatorProfile.followerTier}
                      </p>
                      <p className="text-xs text-brand-ocean/80">{item.reason}</p>
                    </div>
                    <Link
                      href={`/creators/${item.creator.id}`}
                      className="rounded-full border border-brand-ocean px-3 py-1 text-xs text-brand-ocean"
                    >
                      View
                    </Link>
                  </div>
                ))}
                {!feed.length ? <p className="text-sm text-slate-500">No feed yet.</p> : null}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Today’s Steps" subtitle="Small actions that stack up.">
        <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Completed today: {completedCount}/{todaySteps.length}
        </div>
        <div className="space-y-2">
          {todaySteps.map((step) => (
            <div key={step.id} className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="font-medium text-brand-ink">{step.dailyStep.title}</p>
              <p className="text-xs text-slate-600">{step.dailyStep.description}</p>
              <p className="mt-1 text-xs text-brand-ocean">Status: {step.status}</p>
            </div>
          ))}
          {!todaySteps.length ? <p className="text-sm text-slate-500">No steps assigned yet.</p> : null}
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Current streak: <span className="font-semibold">{streak?.currentStreak ?? 0}</span> days
          <br />
          Best streak: <span className="font-semibold">{streak?.longestStreak ?? 0}</span> days
        </div>
      </SectionCard>
    </div>
  );
}
