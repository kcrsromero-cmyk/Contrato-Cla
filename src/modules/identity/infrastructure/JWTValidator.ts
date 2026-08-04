import jwt from 'jsonwebtoken';

export class JWTValidator {
  private secret: string;

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }
    this.secret = secret;
  }

  /**
   * Validates a JWT token locally without calling the provider.
   * Useful for fast middleware checks if the token is self-contained.
   */
  verify(token: string): any {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
