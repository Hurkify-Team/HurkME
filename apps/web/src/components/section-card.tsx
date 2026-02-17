import clsx from 'clsx';

export function SectionCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-brand-ink">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
