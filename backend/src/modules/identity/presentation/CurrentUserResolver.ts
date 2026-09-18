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
          select: {
             id: true,
             email: true,
             name: true,
             roles: true,
             phone: true,
             telegramUsername: true,
             organizationId: true,
             createdAt: true,
             notifyEmail: true,
             notifyTelegram: true,
             notifySms: true,
             planId: true,
             planExpiresAt: true,
             plan: {
                 select: {
                     name: true,
                     maxFavoriteEntities: true,
                     capabilities: { select: { capability: { select: { name: true } } } }
                 }
             }
          }
        });

        user.planExpiresAt = dbUser?.planExpiresAt || null;

        // Check plan expiration
        const planName = dbUser?.plan?.name || 'FREE';
        const isExpired = planName !== 'FREE' && dbUser?.planExpiresAt && new Date() >= new Date(dbUser.planExpiresAt);

        if (dbUser?.plan && !isExpired) {
            user.plan = dbUser.plan.name;
            user.maxFavoriteEntities = dbUser.plan.maxFavoriteEntities;
            user.capabilities = dbUser.plan.capabilities.map((pc: any) => pc.capability.name);
        } else {
            const freePlan = await prisma.plan.findUnique({
              where: { name: 'FREE' },
              select: {
                maxFavoriteEntities: true,
                capabilities: { select: { capability: { select: { name: true } } } }
              }
            });

            user.plan = 'FREE';
            user.maxFavoriteEntities = freePlan?.maxFavoriteEntities ?? 0;
            user.capabilities = freePlan?.capabilities.map((pc: any) => pc.capability.name) ?? [];
        }

        user.phone = dbUser.phone;
        user.telegramUsername = dbUser.telegramUsername;
        user.notifyEmail = dbUser.notifyEmail;
        user.notifyTelegram = dbUser.notifyTelegram;
        user.notifySms = dbUser.notifySms;

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
