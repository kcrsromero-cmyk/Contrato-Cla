import { AuthenticatedUser } from './AuthenticatedUser';
import { AuthResult, LoginCredentials, RegisterCredentials } from './dtos';

export interface IdentityProvider {
  /**
   * Registers a new user.
   * @param credentials Registration credentials
   */
  register(credentials: RegisterCredentials): Promise<AuthResult>;

  /**
   * Authenticates a user.
   * @param credentials Login credentials
   */
  login(credentials: LoginCredentials): Promise<AuthResult>;

  /**
   * Logs out the current user.
   */
  logout(token: string): Promise<void>;

  /**
   * Refreshes the authentication token.
   * @param refreshToken The refresh token
   */
  refresh(refreshToken: string): Promise<AuthResult>;

  /**
   * Gets the authenticated user details using their token.
   * @param token The access token
   */
  getUser(token: string): Promise<AuthenticatedUser | null>;

  /**
   * Initiates a password reset flow.
   * @param email The user's email
   */
  resetPassword(email: string): Promise<void>;
}
