'use client';

import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { AUTH_BYPASS, setDevAuthProviderId } from '@/lib/auth';

export default function SignInPage() {
  if (AUTH_BYPASS) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-brand-ink">Demo sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Local auth bypass is ON. Pick a demo account to continue.
          </p>
          <div className="mt-5 space-y-2">
            <button
              className="w-full rounded-xl bg-brand-ocean px-4 py-2 text-white"
              onClick={() => {
                setDevAuthProviderId('demo_creator_1');
                window.location.href = '/home';
              }}
            >
              Continue as Creator (T1)
            </button>
            <button
              className="w-full rounded-xl bg-brand-mint px-4 py-2 text-brand-ink"
              onClick={() => {
                setDevAuthProviderId('demo_admin_1');
                window.location.href = '/admin';
              }}
            >
              Continue as Admin
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Disable `NEXT_PUBLIC_AUTH_BYPASS` in `.env.local` to use Clerk sign-in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <SignIn signUpUrl="/sign-up" redirectUrl="/home" />
      <p className="absolute bottom-6 text-sm text-slate-500">
        New here? <Link href="/sign-up">Create account</Link>
      </p>
    </div>
  );
}
