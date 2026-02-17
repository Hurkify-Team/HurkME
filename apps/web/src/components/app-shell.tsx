'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const HEALTH_POLL_MS = 30_000;
const HEALTH_TIMEOUT_MS = 4_000;

const tabs = [
  { href: '/home', label: 'Home' },
  { href: '/daily-steps', label: 'Daily Steps' },
  { href: '/find-people', label: 'Find Your People' },
  { href: '/paid-jobs', label: 'Paid Jobs' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/profile', label: 'Profile' },
  { href: '/admin', label: 'Admin' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let cancelled = false;

    const pingApi = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

      try {
        const response = await fetch(`${API_URL}/health`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!cancelled) {
          setApiStatus(response.ok ? 'online' : 'offline');
        }
      } catch {
        if (!cancelled) {
          setApiStatus('offline');
        }
      } finally {
        clearTimeout(timeout);
      }
    };

    void pingApi();
    const interval = setInterval(() => {
      void pingApi();
    }, HEALTH_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1_0%,#fff7ed_38%,#f8fafc_70%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-8 pt-6 sm:px-6">
        <header className="mb-5 rounded-2xl border border-brand-mint/20 bg-white/70 px-5 py-4 shadow-card backdrop-blur">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-brand-ocean/70">HurkME</p>
              <h1 className="text-2xl font-semibold text-brand-ink">Creator growth that stays legit</h1>
              <div className="mt-2 inline-flex items-center gap-2 text-xs">
                <span
                  className={clsx(
                    'inline-block h-2 w-2 rounded-full',
                    apiStatus === 'online'
                      ? 'bg-emerald-500'
                      : apiStatus === 'offline'
                        ? 'bg-rose-500'
                        : 'bg-amber-400',
                  )}
                />
                <span className="text-slate-600">
                  API {apiStatus === 'checking' ? 'checking...' : apiStatus}
                </span>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={clsx(
                      'rounded-full px-3 py-1.5 text-sm transition',
                      active
                        ? 'bg-brand-ocean text-white'
                        : 'bg-brand-cream text-brand-ink hover:bg-brand-mint/25',
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
