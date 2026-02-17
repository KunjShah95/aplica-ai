import { TeamRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
}

export { TeamRole };

