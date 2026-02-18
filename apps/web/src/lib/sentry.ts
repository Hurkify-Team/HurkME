let initialized = false;

export function initSentryPlaceholder(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  // Placeholder hook for future @sentry/nextjs setup.
  if (process.env.NODE_ENV !== 'production') {
    console.info('[sentry] placeholder enabled for web client');
  }
}
