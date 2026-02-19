import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { SentryBootstrap } from '@/components/sentry-bootstrap';
import { AUTH_BYPASS } from '@/lib/auth-mode';
import './globals.css';

export const metadata: Metadata = {
  title: 'HurkME',
  description: 'Daily creator growth, real creator connections, and trusted paid jobs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (AUTH_BYPASS) {
    return (
      <html lang="en">
        <body>
          <SentryBootstrap />
          {children}
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <SentryBootstrap />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
