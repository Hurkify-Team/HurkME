'use client';

import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { AUTH_BYPASS } from '@/lib/auth';
import { AppShell } from './app-shell';

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  if (AUTH_BYPASS) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <>
      <SignedIn>
        <AppShell>{children}</AppShell>
      </SignedIn>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-brand-ink">Sign in to continue</h1>
            <p className="mt-2 text-sm text-slate-600">
              Your HurkME workspace is private. Sign in to open your dashboard.
            </p>
            <Link
              href="/sign-in"
              className="mt-5 inline-block rounded-full bg-brand-ocean px-4 py-2 text-sm font-medium text-white"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
