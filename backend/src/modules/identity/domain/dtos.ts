import { Email, OrganizationId, Permissions, Roles, UserId } from './types';

export interface UserProfile {
  id: UserId;
  email: Email;
  organizationId?: OrganizationId;
  roles: Roles;
  permissions: Permissions;
  name?: string;
  avatarUrl?: string;
}

export interface LoginCredentials {
  email: Email;
  password: string;
}

export interface RegisterCredentials {
  email: Email;
  password: string;
  name?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}
