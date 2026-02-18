import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { SentryBootstrap } from '@/components/sentry-bootstrap';
import './globals.css';

export const metadata: Metadata = {
  title: 'HurkME',
  description: 'Daily creator growth, real creator connections, and trusted paid jobs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';

  if (authBypass) {
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
