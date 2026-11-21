import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { NotificationsController } from './NotificationsController';
import { NotificationService } from '../application/NotificationService';
import { NotifierRegistry } from '../infrastructure/NotifierRegistry';
import { AppriseNotifier } from '../infrastructure/AppriseNotifier';
import { EmptyBodySchema } from './NotificationSchemas';
import { config } from '../../../infrastructure/config/env';
import { prisma } from '../../../infrastructure/db/prisma';
import { FallbackRedisStore } from '../../../infrastructure/security/rateLimitStore';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { CurrentUserResolver } from '../../identity/presentation/CurrentUserResolver';
import { validateRequest } from '../../identity/presentation/ValidationMiddleware';
import { IdentityService } from '../../identity/application/IdentityService';
import { IdentityProviderRegistry } from '../../identity/infrastructure/IdentityProviderRegistry';
import { jwtValidator } from '../../../infrastructure/security/jwtValidator';

const notificationsRouter = Router();

NotifierRegistry.register(
  'apprise',
  new AppriseNotifier({ baseUrl: config.APPRISE_URL, botToken: config.TELEGRAM_BOT_TOKEN })
);

const notificationService = new NotificationService(prisma);
const notificationsController = new NotificationsController(notificationService, {
  botUsername: config.TELEGRAM_BOT_USERNAME,
});

const activeProvider = IdentityProviderRegistry.resolve();
const identityService = new IdentityService(activeProvider);
const authMiddleware = new AuthMiddleware(jwtValidator);
const currentUserResolver = new CurrentUserResolver(identityService);

const notificationsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new FallbackRedisStore(redisAppClient, 'rl:notifications:'),
  message: { error: 'Too many notification requests, please try again in a minute.' },
});

notificationsRouter.post(
  '/telegram/link-code',
  authMiddleware.handle,
  currentUserResolver.resolve,
  notificationsLimiter,
  validateRequest(EmptyBodySchema),
  (req, res) => notificationsController.createTelegramLinkCode(req, res)
);

notificationsRouter.post(
  '/test',
  authMiddleware.handle,
  currentUserResolver.resolve,
  notificationsLimiter,
  validateRequest(EmptyBodySchema),
  (req, res) => notificationsController.sendTest(req, res)
);

export { notificationsRouter };
