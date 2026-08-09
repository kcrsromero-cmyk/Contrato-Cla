import { Request, Response, NextFunction } from 'express';
import { IdentityService } from '../application/IdentityService';

export class CurrentUserResolver {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * Express middleware to resolve the full domain user and attach it to the request.
   * Typically runs after AuthMiddleware.
   */
  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return next(); // Pass through, let subsequent handlers decide if auth is required
      }

      const token = authHeader.split(' ')[1];
      const user = await this.identityService.getCurrentUser(token);

      if (user) {
        (req as any).user = user;
      }

      next();
    } catch (error) {
      // Don't fail the request here, just don't attach the user
      // Or you could return 401 depending on the strictness required
      next();
    }
  };
}
