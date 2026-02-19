'use client';

import { AUTH_BYPASS as AUTH_BYPASS_MODE } from './auth-mode';

export const AUTH_BYPASS = AUTH_BYPASS_MODE;

const DEV_STORAGE_KEY = 'hurkme_dev_auth_provider_id';

export function getDevAuthProviderId(): string {
  if (typeof window === 'undefined') {
    return 'demo_creator_1';
  }

  const existing = window.localStorage.getItem(DEV_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  window.localStorage.setItem(DEV_STORAGE_KEY, 'demo_creator_1');
  return 'demo_creator_1';
}

export function setDevAuthProviderId(value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DEV_STORAGE_KEY, value);
}
