import type { UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  authProviderId: string;
  email: string;
  displayName: string;
  role: UserRole;
};
