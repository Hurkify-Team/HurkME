'use client';

import { useEffect, useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import type { UserDailyStep } from '@/lib/types';

export default function DailyStepsPage() {
  const { request } = useApiClient();
  const [steps, setSteps] = useState<UserDailyStep[]>([]);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(
    null,
  );
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [stepsRes, streakRes] = await Promise.all([
        request<UserDailyStep[]>('/daily-steps/today'),
        request<{ currentStreak: number; longestStreak: number }>('/streaks'),
      ]);
      setSteps(stepsRes);
      setStreak(streakRes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load daily steps');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const completedCount = useMemo(
    () => steps.filter((step) => step.status === 'COMPLETED').length,
    [steps],
  );

  const completeStep = async (id: string) => {
    try {
      setLoadingId(id);
      await request(`/daily-steps/${id}/complete`, {
        method: 'POST',
        json: {
          evidenceUrl: evidence[id] || undefined,
        },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete step');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <SectionCard title="Daily Steps" subtitle="3 to 5 simple actions for today">
        <InlineError message={error} />
        <div className="mb-4 rounded-xl bg-brand-cream px-4 py-3 text-sm text-brand-ink">
          Completed today: <span className="font-semibold">{completedCount}</span> of{' '}
          <span className="font-semibold">{steps.length}</span>
        </div>
        <div className="space-y-3">
          {steps.map((step) => (
            <article key={step.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-ink">{step.dailyStep.title}</h3>
                  <p className="text-sm text-slate-600">{step.dailyStep.description}</p>
                  <p className="mt-1 text-xs text-brand-ocean">
                    Reward: {step.dailyStep.rewardPoints} points • Difficulty {step.dailyStep.difficulty}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    step.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {step.status}
                </span>
              </div>

              {step.status !== 'COMPLETED' ? (
                <div className="mt-3 space-y-2">
                  <input
                    placeholder="Optional proof link"
                    value={evidence[step.id] ?? ''}
                    onChange={(event) => {
                      setEvidence((prev) => ({
                        ...prev,
                        [step.id]: event.target.value,
                      }));
                    }}
                  />
                  <button
                    className="rounded-full bg-brand-ocean px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    onClick={() => completeStep(step.id)}
                    disabled={loadingId === step.id}
                  >
                    {loadingId === step.id ? 'Saving...' : 'Mark complete'}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {!steps.length ? <p className="text-sm text-slate-500">No steps yet.</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Streak" subtitle="Consistency is your edge">
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Current streak</p>
          <p className="text-3xl font-semibold text-emerald-900">{streak?.currentStreak ?? 0}</p>
          <p className="mt-1 text-xs text-emerald-700">days in a row</p>
        </div>
        <div className="mt-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
          Best streak: <span className="font-semibold">{streak?.longestStreak ?? 0}</span> days
        </div>
      </SectionCard>
    </div>
  );
}
