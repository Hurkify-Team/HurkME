'use client';

import { SignUp } from '@clerk/nextjs';
import { AUTH_BYPASS } from '@/lib/auth';

export default function SignUpPage() {
  if (AUTH_BYPASS) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-brand-ink">Sign up disabled in demo mode</h1>
          <p className="mt-2 text-sm text-slate-600">
            Use `/sign-in` to continue with a demo account while auth bypass is enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <SignUp signInUrl="/sign-in" redirectUrl="/home" />
    </div>
  );
}
