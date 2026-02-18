'use client';

import { useEffect } from 'react';
import { initSentryPlaceholder } from '@/lib/sentry';

export function SentryBootstrap() {
  useEffect(() => {
    initSentryPlaceholder();
  }, []);

  return null;
}
