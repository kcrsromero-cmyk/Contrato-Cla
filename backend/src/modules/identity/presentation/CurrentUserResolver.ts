import { Request, Response, NextFunction } from 'express';
import { IdentityService } from '../application/IdentityService';
import { prisma } from '../../../infrastructure/db/prisma';

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
        // Hydrate with capabilities from DB
        const dbUser = await prisma.user.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: ['USER'],
          },
          update: {},
          include: {
             plan: {
                 include: {
                     capabilities: {
                         include: {
                             capability: true
                         }
                     }
                 }
             }
          }
        });

        if (dbUser?.plan) {
            user.plan = dbUser.plan.name;
            user.capabilities = dbUser.plan.capabilities.map((pc: any) => pc.capability.name);
        } else {
            user.plan = 'FREE';
            user.capabilities = [];
        }

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
