import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { UserProfile } from '../domain/dtos';

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
}
