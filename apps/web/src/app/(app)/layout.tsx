import { DevAuthSwitcher } from '@/components/dev-auth-switcher';
import { ProtectedShell } from '@/components/protected-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedShell>
      <DevAuthSwitcher />
      {children}
    </ProtectedShell>
  );
}
