import { Request, Response, NextFunction } from 'express';
import { JWTValidator } from '../infrastructure/JWTValidator';

export class AuthMiddleware {
  constructor(private readonly jwtValidator: JWTValidator) {}

  /**
   * Express middleware to validate JWT in the Authorization header.
   */
  handle = (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
      }

      const token = authHeader.split(' ')[1];
      const payload = this.jwtValidator.verify(token);

      // Attach raw payload to request for further processing
      (req as any).tokenPayload = payload;

      next();
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  };
}
