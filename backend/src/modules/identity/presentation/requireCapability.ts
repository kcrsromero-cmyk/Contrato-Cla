import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';

export const requireCapability = (capability: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthenticatedUser;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    if (!user.capabilities || !user.capabilities.includes(capability)) {
      return res.status(403).json({ error: `Forbidden: Requires ${capability} capability` });
    }

    next();
  };
};
