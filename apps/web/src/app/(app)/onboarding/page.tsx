'use client';

import { useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import { onboardingSchema } from '@/lib/schemas';

const niches = [
  'FITNESS',
  'TECH',
  'FASHION',
  'MUSIC',
  'BUSINESS',
  'EDUCATION',
  'LIFESTYLE',
  'COMEDY',
  'GAMING',
  'OTHER',
] as const;

export default function OnboardingPage() {
  const { request } = useApiClient();
  const [form, setForm] = useState({
    primaryPlatform: 'INSTAGRAM',
    primaryNiche: 'FITNESS',
    secondaryNiches: '',
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

  const submit = async () => {
    try {
      setSubmitting(true);

      const payload = {
        primaryPlatform: form.primaryPlatform,
        primaryNiche: form.primaryNiche,
        secondaryNiches: form.secondaryNiches
          .split(',')
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean),
        followerCount: Number(form.followerCount),
        goal: form.goal,
        growthStyle: form.growthStyle,
        audienceRegion: form.audienceRegion,
        audienceAgeBand: form.audienceAgeBand || undefined,
        country: form.country,
        language: form.language,
        displayName: form.displayName,
        bio: form.bio || undefined,
        photoUrl: form.photoUrl || undefined,
        socialLinks: {
          instagram: form.instagram || undefined,
          tiktok: form.tiktok || undefined,
          youtube: form.youtube || undefined,
          x: form.x || undefined,
          linkedin: form.linkedin || undefined,
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

      setSuccess('Onboarding saved. Your feed and matches will refresh shortly.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard title="Creator DNA Onboarding" subtitle="Keep it short. Finish in under 90 seconds.">
      <InlineError message={error} />
      {success ? (
        <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label>
          Primary platform
          <select
            value={form.primaryPlatform}
            onChange={(event) => setForm((prev) => ({ ...prev, primaryPlatform: event.target.value }))}
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
            onChange={(event) => setForm((prev) => ({ ...prev, primaryNiche: event.target.value }))}
          >
            {niches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
        </label>

        <label>
          Secondary niches (optional, comma-separated)
          <input
            placeholder="TECH, EDUCATION"
            value={form.secondaryNiches}
            onChange={(event) => setForm((prev) => ({ ...prev, secondaryNiches: event.target.value }))}
          />
        </label>

        <label>
          Follower count
          <input
            type="number"
            min={1000}
            value={form.followerCount}
            onChange={(event) => setForm((prev) => ({ ...prev, followerCount: event.target.value }))}
          />
        </label>

        <label>
          Main goal
          <select value={form.goal} onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}>
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
            onChange={(event) => setForm((prev) => ({ ...prev, growthStyle: event.target.value }))}
          >
            <option value="DAILY_STEPS">Daily steps</option>
            <option value="COLLABORATION">Collaboration</option>
            <option value="TRENDS">Trends</option>
            <option value="DATA_LIGHT_GUIDANCE">Data-light guidance</option>
          </select>
        </label>

        <label>
          Audience region
          <select
            value={form.audienceRegion}
            onChange={(event) => setForm((prev) => ({ ...prev, audienceRegion: event.target.value }))}
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
            onChange={(event) => setForm((prev) => ({ ...prev, audienceAgeBand: event.target.value }))}
          />
        </label>

        <label>
          Country
          <input
            value={form.country}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value.toUpperCase() }))}
          />
        </label>

        <label>
          Language
          <input
            value={form.language}
            onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
          />
        </label>

        <label>
          Display name
          <input
            value={form.displayName}
            onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
          />
        </label>

        <label className="md:col-span-2">
          Bio
          <textarea
            rows={3}
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
          />
        </label>

        <label className="md:col-span-2">
          Profile photo URL
          <input
            value={form.photoUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
          />
        </label>

        <label>
          Instagram URL
          <input
            value={form.instagram}
            onChange={(event) => setForm((prev) => ({ ...prev, instagram: event.target.value }))}
          />
        </label>
        <label>
          TikTok URL
          <input
            value={form.tiktok}
            onChange={(event) => setForm((prev) => ({ ...prev, tiktok: event.target.value }))}
          />
        </label>
        <label>
          YouTube URL
          <input
            value={form.youtube}
            onChange={(event) => setForm((prev) => ({ ...prev, youtube: event.target.value }))}
          />
        </label>
        <label>
          X URL
          <input
            value={form.x}
            onChange={(event) => setForm((prev) => ({ ...prev, x: event.target.value }))}
          />
        </label>
        <label className="md:col-span-2">
          LinkedIn URL
          <input
            value={form.linkedin}
            onChange={(event) => setForm((prev) => ({ ...prev, linkedin: event.target.value }))}
          />
        </label>
      </div>

      <button
        className="mt-4 rounded-full bg-brand-ocean px-5 py-2 text-white disabled:opacity-60"
        onClick={() => void submit()}
        disabled={submitting}
      >
        {submitting ? 'Saving...' : 'Save Creator DNA'}
      </button>
    </SectionCard>
  );
}
