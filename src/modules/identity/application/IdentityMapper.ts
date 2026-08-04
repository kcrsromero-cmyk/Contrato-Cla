import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { UserProfile } from '../domain/dtos';
import { Role } from '../domain/types';

export class IdentityMapper {
  /**
   * Maps an internal AuthenticatedUser domain entity to a UserProfile DTO
   * suitable for exposure to external layers (like the frontend).
   */
  static toUserProfile(user: AuthenticatedUser): UserProfile {
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles,
      permissions: user.permissions,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }

  /**
   * Maps a generic provider user payload to the domain AuthenticatedUser entity.
   */
  static fromProviderPayload(payload: any): AuthenticatedUser {
    return {
      id: payload.id || payload.sub,
      email: payload.email,
      // Extrapolate roles and permissions from app metadata or default to USER
      roles: (payload.app_metadata?.roles as Role[]) || ['USER'],
      permissions: payload.app_metadata?.permissions || [],
      organizationId: payload.app_metadata?.organizationId,
      name: payload.user_metadata?.name || payload.name,
      avatarUrl: payload.user_metadata?.avatar_url || payload.picture,
      lastLoginAt: payload.last_sign_in_at ? new Date(payload.last_sign_in_at) : undefined,
      metadata: payload.user_metadata,
    };
  }
}
