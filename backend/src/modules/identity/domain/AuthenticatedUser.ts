import { Email, OrganizationId, Permissions, Roles, UserId } from './types';

export interface AuthenticatedUser {
  id: UserId;
  email: Email;
  organizationId?: OrganizationId;
  roles: Roles;
  permissions: Permissions;
  name?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  metadata?: Record<string, any>;
  plan?: string;
  capabilities?: string[];
  phone?: string | null;
  telegramUsername?: string | null;
  notifyEmail?: boolean;
  notifyTelegram?: boolean;
  notifySms?: boolean;
}
