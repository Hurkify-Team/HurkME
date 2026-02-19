import Link from 'next/link';
import { AUTH_BYPASS } from '@/lib/auth-mode';

const pillars = [
  {
    title: 'Grow with Daily Steps',
    description:
      'Get 3 to 5 clear steps each day. Do them yourself, then mark done with optional proof links.',
    accent: 'from-teal-500/20 to-emerald-400/10',
  },
  {
    title: 'Find Your People',
    description:
      'Meet creators that match your niche, style, and level. Save, connect, and send collab requests.',
    accent: 'from-cyan-500/20 to-sky-400/10',
  },
  {
    title: 'Earn from Paid Jobs',
    description:
      'Apply for brand jobs, submit proof, and get paid based on verified performance with anti-fraud checks.',
    accent: 'from-orange-400/25 to-amber-300/10',
  },
];

const flow = [
  {
    step: '01',
    title: 'Quick Creator DNA',
    text: 'Tell us your platform, niche, goal, audience region, and follower count in under 90 seconds.',
  },
  {
    step: '02',
    title: 'Daily Momentum',
    text: 'Get your Daily Steps and keep your streak alive with simple actions you can finish every day.',
  },
  {
    step: '03',
    title: 'Trusted Earnings',
    text: 'Submit post links and screenshots, pass review, and receive payouts from performance results.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-[#f4f9f8] text-brand-ink">
      <div className="pointer-events-none absolute inset-0 landing-grid opacity-40" />
      <div className="pointer-events-none absolute -left-28 top-[-8rem] h-72 w-72 rounded-full bg-teal-300/30 blur-3xl float-slow" />
      <div
        className="pointer-events-none absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-orange-300/25 blur-3xl float-slow"
        style={{ animationDelay: '0.8s' }}
      />

      <div className="relative mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <header className="reveal flex items-center justify-between rounded-2xl border border-teal-900/10 bg-white/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-content-center rounded-xl bg-brand-ocean text-sm font-bold text-white">
              HM
            </div>
            <div>
              <p className="font-display text-base font-bold tracking-tight">HurkME</p>
              <p className="text-xs text-slate-600">Creator growth that stays legit</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-full border border-brand-ocean/20 bg-white px-4 py-2 text-sm font-medium text-brand-ocean hover:bg-brand-ocean/5"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-brand-ocean px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Sign up
            </Link>
          </nav>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="reveal space-y-6" style={{ animationDelay: '0.1s' }}>
            <span className="inline-flex rounded-full border border-teal-800/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-ocean">
              Africa-first, global-ready creator platform
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight text-[#0b2f3f] sm:text-5xl lg:text-6xl">
              Grow daily.
              <br />
              Connect right.
              <br />
              Earn fairly.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
              HurkME helps creators grow their audience, find the right creator circle, and earn
              from Paid Jobs using real performance data. No fake followers. No bots. No shady
              shortcuts.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="rounded-full bg-brand-ocean px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-teal-700"
              >
                Create your account
              </Link>
              <Link
                href="/sign-in"
                className="rounded-full border border-brand-ocean/20 bg-white px-6 py-3 text-sm font-semibold text-brand-ocean transition hover:bg-brand-ocean/5"
              >
                Open sign in
              </Link>
              {AUTH_BYPASS ? (
                <Link
                  href="/sign-in"
                  className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-200"
                >
                  Demo mode is ON
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-slate-600">
              For creators with 1k+ followers and brands ready to pay for real results.
            </p>
          </div>

          <aside className="reveal rounded-3xl border border-brand-ocean/15 bg-white/85 p-5 shadow-card backdrop-blur sm:p-6" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-ocean/80">
              Why creators trust HurkME
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-display text-xl font-bold text-brand-ink">3-5</p>
                <p className="text-sm text-slate-600">Daily Steps assigned every day at 6am</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-display text-xl font-bold text-brand-ink">Top 200</p>
                <p className="text-sm text-slate-600">Niche matches stored per creator profile</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-display text-xl font-bold text-brand-ink">Base + Bonus</p>
                <p className="text-sm text-slate-600">
                  Payout model with authenticity score and manual review
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="reveal mt-12 rounded-3xl border border-rose-200/60 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7" style={{ animationDelay: '0.25s' }}>
          <p className="font-display text-lg font-bold text-[#7f1d1d]">Compliance first</p>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-700 sm:text-base">
            HurkME does not automate likes, follows, or comments on external platforms. We do not
            promise or deliver followers. We recommend actions, collect proof, and run performance
            based payouts inside HurkME.
          </p>
        </section>

        <section className="mt-12">
          <div className="reveal flex items-end justify-between gap-4" style={{ animationDelay: '0.3s' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ocean/80">
                Product layers
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
                One platform, three outcomes
              </h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {pillars.map((pillar, index) => (
              <article
                key={pillar.title}
                className="reveal relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                style={{ animationDelay: `${0.34 + index * 0.08}s` }}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${pillar.accent}`} />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ocean/80">
                  {index === 0 ? 'Grow' : index === 1 ? 'Connect' : 'Earn'}
                </p>
                <h3 className="font-display mt-2 text-xl font-bold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-brand-ocean/15 bg-[#eaf8f5]/90 p-5 sm:p-7">
          <div className="reveal" style={{ animationDelay: '0.45s' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-ocean/80">
              How it works
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
              Start in minutes, build for the long run
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {flow.map((item, index) => (
              <div
                key={item.step}
                className="reveal rounded-2xl border border-teal-900/10 bg-white px-4 py-5"
                style={{ animationDelay: `${0.5 + index * 0.08}s` }}
              >
                <p className="font-display text-2xl font-bold text-brand-ocean/80">{item.step}</p>
                <h3 className="mt-2 text-lg font-semibold text-brand-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="reveal mt-12 rounded-3xl bg-brand-ink px-6 py-8 text-white shadow-card sm:px-8" style={{ animationDelay: '0.58s' }}>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Ready to grow, connect, and earn the right way?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">
            Join HurkME and start your first Daily Steps today. Simple flow, trusted payouts, clear
            growth path.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-ink hover:bg-slate-100"
            >
              Start free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
