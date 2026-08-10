import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { AuthResult, LoginCredentials, RegisterCredentials, UserProfile } from '../domain/dtos';
import { IdentityProvider } from '../domain/IdentityProvider';
import { IUserRepository } from '../domain/IUserRepository';
import { IOrganizationRepository } from '../domain/IOrganizationRepository';
import { randomUUID } from 'crypto';

export class IdentityService {
  constructor(
    private readonly provider: IdentityProvider,
    private readonly userRepository: IUserRepository,
    private readonly organizationRepository: IOrganizationRepository
  ) {}

  /**
   * Registers a new user via the configured identity provider and synchronizes with local database.
   */
  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    // 1. Register with the Identity Provider (e.g. Supabase)
    const result = await this.provider.register(credentials);

    try {
      // 2. Synchronization: Create Organization if not provided
      let orgId = credentials.organizationId;
      if (!orgId) {
        const newOrg = await this.organizationRepository.create({
          id: randomUUID(),
          name: `${credentials.name || 'Default'}'s Organization`,
        });
        orgId = newOrg.id;
      }

      // 3. Synchronization: Create User in local database with the UUID from Identity Provider
      await this.userRepository.create({
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        roles: result.user.roles,
        permissions: result.user.permissions,
        organizationId: orgId,
      });

      // Attach organization ID to the returned result for consistency
      result.user.organizationId = orgId;

      return result;
    } catch (dbError) {
      console.error('Failed to synchronize user to local database:', dbError);
      // In a production system, you might want to rollback the Identity Provider registration here
      // or implement a retry mechanism.
      throw dbError;
    }
  }

  /**
   * Authenticates a user and returns their profile along with access tokens.
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    return this.provider.login(credentials);
  }

  /**
   * Logs out the user associated with the given token.
   */
  async logout(token: string): Promise<void> {
    await this.provider.logout(token);
  }

  /**
   * Refreshes the user's authentication tokens.
   */
  async refresh(refreshToken: string): Promise<AuthResult> {
    return this.provider.refresh(refreshToken);
  }

  /**
   * Validates the provided token.
   * Throws an error if the token is invalid.
   */
  async verifyToken(token: string): Promise<any> {
    return this.provider.verifyToken(token);
  }

  /**
   * Retrieves the current user profile based on their token.
   */
  async getCurrentUser(token: string): Promise<AuthenticatedUser | null> {
    return this.provider.getUser(token);
  }

  /**
   * Initiates the password reset process.
   */
  async resetPassword(email: string): Promise<void> {
    await this.provider.resetPassword(email);
  }
}
