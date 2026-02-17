'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';

export default function CreatorProfilePage() {
  const params = useParams<{ id: string }>();
  const { request } = useApiClient();
  const [creator, setCreator] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await request<any>(`/creators/${params.id}`);
        setCreator(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load creator profile');
      }
    };

    if (params.id) {
      void load();
    }
  }, [params.id, request]);

  const interact = async (action: 'SAVE' | 'FEEDBACK' | 'COLLAB_REQUEST') => {
    try {
      await request('/interactions', {
        method: 'POST',
        json: {
          targetUserId: params.id,
          action,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send interaction');
    }
  };

  return (
    <SectionCard title="Creator profile" subtitle="Quick snapshot before you collaborate.">
      <InlineError message={error} />
      {creator ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-xl font-semibold text-brand-ink">{creator.displayName}</h2>
            <p className="text-sm text-slate-600">{creator.creatorProfile?.bio ?? 'No bio yet.'}</p>
            <p className="mt-2 text-sm text-brand-ocean">
              {creator.creatorProfile?.primaryNiche} • {creator.creatorProfile?.followerTier} •{' '}
              {creator.creatorProfile?.primaryPlatform}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Country: {creator.creatorProfile?.country ?? 'N/A'} • Language:{' '}
              {creator.creatorProfile?.language ?? 'N/A'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full bg-slate-100 px-3 py-1 text-sm"
              onClick={() => void interact('SAVE')}
            >
              Save creator
            </button>
            <button
              className="rounded-full bg-slate-100 px-3 py-1 text-sm"
              onClick={() => void interact('FEEDBACK')}
            >
              Send feedback
            </button>
            <button
              className="rounded-full bg-brand-ocean px-3 py-1 text-sm text-white"
              onClick={() => void interact('COLLAB_REQUEST')}
            >
              Send collab request
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600">Loading profile...</p>
      )}
    </SectionCard>
  );
}
