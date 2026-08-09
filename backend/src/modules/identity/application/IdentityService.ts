import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { AuthResult, LoginCredentials, RegisterCredentials, UserProfile } from '../domain/dtos';
import { IdentityProvider } from '../domain/IdentityProvider';

export class IdentityService {
  constructor(private readonly provider: IdentityProvider) {}

  /**
   * Registers a new user via the configured identity provider.
   */
  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    return this.provider.register(credentials);
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
