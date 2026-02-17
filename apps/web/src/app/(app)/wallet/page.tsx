'use client';

import { useEffect, useState } from 'react';
import { InlineError } from '@/components/inline-error';
import { SectionCard } from '@/components/section-card';
import { useApiClient } from '@/lib/api';
import { formatNaira, titleCase } from '@/lib/format';
import type { WalletResponse } from '@/lib/types';

export default function WalletPage() {
  const { request } = useApiClient();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [walletRes, payoutsRes] = await Promise.all([
          request<WalletResponse>('/wallet'),
          request<any[]>('/payouts'),
        ]);
        setWallet(walletRes);
        setPayouts(payoutsRes);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load wallet');
      }
    };

    void load();
  }, [request]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
      <SectionCard title="Wallet" subtitle="Track your earnings and payout records.">
        <InlineError message={error} />
        <div className="rounded-xl bg-brand-cream p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-brand-ocean">Available balance</p>
          <p className="text-3xl font-semibold text-brand-ink">
            {formatNaira(wallet?.balance ?? 0)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Pending payouts: <span className="font-semibold">{formatNaira(wallet?.pending ?? 0)}</span>
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm">
          <p>
            Paid total: <span className="font-semibold">{formatNaira(wallet?.payoutSummary.paid ?? 0)}</span>
          </p>
          <p>
            Pending total:{' '}
            <span className="font-semibold">{formatNaira(wallet?.payoutSummary.pending ?? 0)}</span>
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Withdrawals are stubbed in MVP. Admin payout processing is manual.
        </div>
      </SectionCard>

      <SectionCard title="Payout History" subtitle="Campaign-by-campaign records.">
        <div className="space-y-2">
          {payouts.map((payout) => (
            <article key={payout.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-ink">{payout.campaign?.title}</p>
                  <p className="text-xs text-slate-600">Campaign ID: {payout.campaignId}</p>
                </div>
                <p className="text-sm font-semibold text-brand-ocean">{formatNaira(payout.amount)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-600">Status: {titleCase(payout.status)}</p>
            </article>
          ))}
          {!payouts.length ? <p className="text-sm text-slate-500">No payouts yet.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
