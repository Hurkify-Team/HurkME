'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AUTH_BYPASS, getDevAuthProviderId } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 15_000);

type RequestInitWithJson = RequestInit & {
  json?: unknown;
};

export function useApiClient() {
  const getToken = AUTH_BYPASS ? null : useAuth().getToken;

  const request = useCallback(
    async <T>(path: string, init: RequestInitWithJson = {}): Promise<T> => {
      const headers = new Headers(init.headers ?? {});
      headers.set('Accept', 'application/json');
      if (init.json !== undefined) {
        headers.set('Content-Type', 'application/json');
      }

      if (AUTH_BYPASS) {
        const devAuthProviderId = getDevAuthProviderId();
        headers.set('x-dev-auth-provider-id', devAuthProviderId);
        headers.set('x-dev-email', `${devAuthProviderId}@demo.hurkme.local`);
        headers.set('x-dev-display-name', devAuthProviderId.replaceAll('_', ' '));
      } else {
        const token = getToken ? await getToken() : null;
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(`${API_URL}${path}`, {
          ...init,
          headers,
          body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
          cache: 'no-store',
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error(
            `Request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)}s`,
          );
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const payload = (await response.json()) as { message?: string | string[] };
          const message = Array.isArray(payload.message)
            ? payload.message.join(', ')
            : payload.message;
          throw new Error(message || `Request failed: ${response.status}`);
        }

        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      return (await response.text()) as T;
    },
    [getToken],
  );

  return { request };
}
