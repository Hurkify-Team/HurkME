'use client';

import { useMemo, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import { onboardingSchema } from '@/lib/schemas';

const nicheOptions = [
  { value: 'FITNESS', label: 'Fitness' },
  { value: 'TECH', label: 'Tech' },
  { value: 'FASHION', label: 'Fashion' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'LIFESTYLE', label: 'Lifestyle' },
  { value: 'COMEDY', label: 'Comedy' },
  { value: 'GAMING', label: 'Gaming' },
  { value: 'OTHER', label: 'Other' },
] as const;

const stepMeta = [
  { title: 'Growth Setup', subtitle: 'Platform, niche, tier, and growth preference.' },
  { title: 'Audience Basics', subtitle: 'Region, language, and where your audience is.' },
  { title: 'Profile Finish', subtitle: 'Your public profile and social links.' },
] as const;

type FormState = {
  primaryPlatform: string;
  primaryNiche: string;
  secondaryNiches: string[];
  followerCount: string;
  goal: string;
  growthStyle: string;
  audienceRegion: string;
  audienceAgeBand: string;
  country: string;
  language: string;
  displayName: string;
  bio: string;
  photoUrl: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  x: string;
  linkedin: string;
};

function classifyFollowerTier(followerCount: number): 'T1' | 'T2' | 'T3' | 'N/A' {
  if (!Number.isFinite(followerCount) || followerCount < 1000) {
    return 'N/A';
  }

  if (followerCount < 100_000) {
    return 'T1';
  }
  if (followerCount < 500_000) {
    return 'T2';
  }

  return 'T3';
}

export default function OnboardingPage() {
  const { request } = useApiClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    primaryPlatform: 'INSTAGRAM',
    primaryNiche: 'FITNESS',
    secondaryNiches: [],
    followerCount: '1000',
    goal: 'BETTER_ENGAGEMENT',
    growthStyle: 'DAILY_STEPS',
    audienceRegion: 'AFRICA',
    audienceAgeBand: '',
    country: 'NG',
    language: 'English',
    displayName: '',
    bio: '',
    photoUrl: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    x: '',
    linkedin: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const progressPct = useMemo(() => ((step + 1) / stepMeta.length) * 100, [step]);
  const followerCountNum = useMemo(() => Number(form.followerCount), [form.followerCount]);
  const followerTier = useMemo(
    () => classifyFollowerTier(followerCountNum),
    [followerCountNum],
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSecondaryNiche = (niche: string) => {
    setForm((prev) => {
      if (niche === prev.primaryNiche) {
        return prev;
      }

      if (prev.secondaryNiches.includes(niche)) {
        return {
          ...prev,
          secondaryNiches: prev.secondaryNiches.filter((item) => item !== niche),
        };
      }

      return {
        ...prev,
        secondaryNiches: [...prev.secondaryNiches, niche].slice(0, 4),
      };
    });
  };

  const getStepError = (currentStep: number): string | null => {
    if (currentStep === 0) {
      if (!Number.isFinite(followerCountNum) || followerCountNum < 1000) {
        return 'Follower count must be 1,000 or more';
      }
    }

    if (currentStep === 1) {
      if (!form.country.trim()) {
        return 'Country is required';
      }
      if (!form.language.trim()) {
        return 'Language is required';
      }
    }

    if (currentStep === 2) {
      if (form.displayName.trim().length < 2) {
        return 'Display name must be at least 2 characters';
      }
    }

    return null;
  };

  const goNext = () => {
    const stepError = getStepError(step);
    if (stepError) {
      setError(stepError);
      return;
    }

    setError(null);
    setSuccess(null);
    setStep((prev) => Math.min(prev + 1, stepMeta.length - 1));
  };

  const goBack = () => {
    setError(null);
    setSuccess(null);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const submit = async () => {
    try {
      const stepError = getStepError(step);
      if (stepError) {
        setError(stepError);
        return;
      }

      setSubmitting(true);
      const payload = {
        primaryPlatform: form.primaryPlatform,
        primaryNiche: form.primaryNiche,
        secondaryNiches: form.secondaryNiches.filter((niche) => niche !== form.primaryNiche),
        followerCount: followerCountNum,
        goal: form.goal,
        growthStyle: form.growthStyle,
        audienceRegion: form.audienceRegion,
        audienceAgeBand: form.audienceAgeBand.trim() || undefined,
        country: form.country.trim().toUpperCase(),
        language: form.language.trim(),
        displayName: form.displayName.trim(),
        bio: form.bio.trim() || undefined,
        photoUrl: form.photoUrl.trim() || undefined,
        socialLinks: {
          instagram: form.instagram.trim() || undefined,
          tiktok: form.tiktok.trim() || undefined,
          youtube: form.youtube.trim() || undefined,
          x: form.x.trim() || undefined,
          linkedin: form.linkedin.trim() || undefined,
        },
      };

      const parsed = onboardingSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Please check your details');
        return;
      }

      await request('/profile/onboarding', {
        method: 'POST',
        json: parsed.data,
      });

      setSuccess('Creator DNA saved. Feed and matches are updating now.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard title="Creator DNA" subtitle="Quick setup. You can finish this in under 90 seconds.">
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
          <span>
            Step {step + 1} of {stepMeta.length}
          </span>
          <span>{Math.round(progressPct)}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-ocean transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-semibold text-brand-ink">{stepMeta[step].title}</p>
        <p className="text-xs text-slate-600">{stepMeta[step].subtitle}</p>
      </div>

      <InlineError message={error} />
      {success ? (
        <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            Primary platform
            <select
              value={form.primaryPlatform}
              onChange={(event) => setField('primaryPlatform', event.target.value)}
            >
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE">YouTube</option>
              <option value="X">X</option>
              <option value="LINKEDIN">LinkedIn</option>
            </select>
          </label>

          <label>
            Primary niche
            <select
              value={form.primaryNiche}
              onChange={(event) => {
                const nextPrimaryNiche = event.target.value;
                setForm((prev) => ({
                  ...prev,
                  primaryNiche: nextPrimaryNiche,
                  secondaryNiches: prev.secondaryNiches.filter(
                    (niche) => niche !== nextPrimaryNiche,
                  ),
                }));
              }}
            >
              {nicheOptions.map((niche) => (
                <option key={niche.value} value={niche.value}>
                  {niche.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Follower count
            <input
              type="number"
              min={1000}
              value={form.followerCount}
              onChange={(event) => setField('followerCount', event.target.value)}
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Follower tier preview</p>
            <p className="text-lg font-semibold text-brand-ink">{followerTier}</p>
            <p className="text-xs text-slate-500">T1: 1k-99k, T2: 100k-499k, T3: 500k+</p>
          </div>

          <label>
            Main goal
            <select value={form.goal} onChange={(event) => setField('goal', event.target.value)}>
              <option value="FIRST_FOLLOWERS">First followers</option>
              <option value="BETTER_ENGAGEMENT">Better engagement</option>
              <option value="MONETIZE">Monetize</option>
              <option value="AUTHORITY">Authority</option>
              <option value="SALES">Sales</option>
            </select>
          </label>

          <label>
            Preferred growth style
            <select
              value={form.growthStyle}
              onChange={(event) => setField('growthStyle', event.target.value)}
            >
              <option value="DAILY_STEPS">Daily steps</option>
              <option value="COLLABORATION">Collaboration</option>
              <option value="TRENDS">Trends</option>
              <option value="DATA_LIGHT_GUIDANCE">Data-light guidance</option>
            </select>
          </label>

          <div className="md:col-span-2">
            <p className="mb-2 text-sm text-slate-700">Secondary niches (optional)</p>
            <div className="flex flex-wrap gap-2">
              {nicheOptions.map((niche) => {
                const active = form.secondaryNiches.includes(niche.value);
                const disabled = niche.value === form.primaryNiche;
                return (
                  <button
                    key={niche.value}
                    type="button"
                    onClick={() => toggleSecondaryNiche(niche.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      disabled
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : active
                          ? 'border-brand-ocean bg-brand-ocean text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                    }`}
                    disabled={disabled}
                  >
                    {niche.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            Audience region
            <select
              value={form.audienceRegion}
              onChange={(event) => setField('audienceRegion', event.target.value)}
            >
              <option value="LOCAL">Local</option>
              <option value="AFRICA">Africa</option>
              <option value="GLOBAL">Global</option>
              <option value="SPECIFIC_COUNTRY">Specific country</option>
            </select>
          </label>

          <label>
            Audience age band (optional)
            <input
              placeholder="18-24"
              value={form.audienceAgeBand}
              onChange={(event) => setField('audienceAgeBand', event.target.value)}
            />
          </label>

          <label>
            Country
            <input
              value={form.country}
              onChange={(event) => setField('country', event.target.value.toUpperCase())}
              placeholder="NG"
            />
          </label>

          <label>
            Language
            <input
              value={form.language}
              onChange={(event) => setField('language', event.target.value)}
              placeholder="English"
            />
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            Display name
            <input
              value={form.displayName}
              onChange={(event) => setField('displayName', event.target.value)}
              placeholder="How people should see your name"
            />
          </label>

          <label>
            Profile photo URL (optional)
            <input
              value={form.photoUrl}
              onChange={(event) => setField('photoUrl', event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="md:col-span-2">
            Bio
            <textarea
              rows={3}
              value={form.bio}
              onChange={(event) => setField('bio', event.target.value)}
              placeholder="Tell brands and creators what you do."
            />
          </label>

          <label>
            Instagram URL
            <input
              value={form.instagram}
              onChange={(event) => setField('instagram', event.target.value)}
            />
          </label>
          <label>
            TikTok URL
            <input
              value={form.tiktok}
              onChange={(event) => setField('tiktok', event.target.value)}
            />
          </label>
          <label>
            YouTube URL
            <input
              value={form.youtube}
              onChange={(event) => setField('youtube', event.target.value)}
            />
          </label>
          <label>
            X URL
            <input value={form.x} onChange={(event) => setField('x', event.target.value)} />
          </label>
          <label className="md:col-span-2">
            LinkedIn URL
            <input
              value={form.linkedin}
              onChange={(event) => setField('linkedin', event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {step > 0 ? (
          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700"
            onClick={goBack}
            type="button"
          >
            Back
          </button>
        ) : null}

        {step < stepMeta.length - 1 ? (
          <button
            className="rounded-full bg-brand-mint px-4 py-2 text-sm font-medium text-brand-ink"
            onClick={goNext}
            type="button"
          >
            Next
          </button>
        ) : (
          <button
            className="rounded-full bg-brand-ocean px-5 py-2 text-white disabled:opacity-60"
            onClick={() => void submit()}
            disabled={submitting}
            type="button"
          >
            {submitting ? 'Saving...' : 'Save Creator DNA'}
          </button>
        )}
      </div>
    </SectionCard>
  );
}
