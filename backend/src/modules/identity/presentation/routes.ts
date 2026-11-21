import { Router } from 'express';
import { AuthController } from './AuthController';
import { AuthMiddleware } from './AuthMiddleware';
import { CurrentUserResolver } from './CurrentUserResolver';
import { IdentityService } from '../application/IdentityService';
import { SupabaseIdentityProvider } from '../infrastructure/SupabaseIdentityProvider';
import { IdentityProviderRegistry } from '../infrastructure/IdentityProviderRegistry';
import { jwtValidator } from '../../../infrastructure/security/jwtValidator';
import { prisma } from '../../../infrastructure/db/prisma';
import { AuditService } from '../../audit/application/AuditService';
import rateLimit from 'express-rate-limit';
import { FallbackRedisStore } from '../../../infrastructure/security/rateLimitStore';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
import { validateRequest } from './ValidationMiddleware';
import { RegisterSchema, LoginSchema, RefreshSchema, ResetPasswordSchema } from './AuthSchemas';
import { ApiKeyController } from './ApiKeyController';
import { createApiKeysRouter } from './apiKeyRoutes';
import { apiKeyService } from './apiKeyAuth';

// Initialize router
const authRouter = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  store: new FallbackRedisStore(redisAppClient, 'rl:auth:'),
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({ error: options.message });
  },
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 1. Setup Dependencies (Wiring)
// In a real application, this might be handled by a DI container (like Awilix or NestJS)
// For now, we wire them manually.

const auditService = new AuditService(prisma);

const supabaseProvider = new SupabaseIdentityProvider();
// Register the provider
IdentityProviderRegistry.register('supabase', supabaseProvider);

// Resolve the default provider
const activeProvider = IdentityProviderRegistry.resolve();

// Create application service
const identityService = new IdentityService(activeProvider);

// Create presentation components
const authController = new AuthController(identityService, auditService);
const authMiddleware = new AuthMiddleware(jwtValidator);
const currentUserResolver = new CurrentUserResolver(identityService);

// 2. Define Routes

// Public routes
authRouter.post('/register', authRateLimiter, validateRequest(RegisterSchema), (req, res) => authController.register(req, res));
authRouter.post('/login', authRateLimiter, validateRequest(LoginSchema), (req, res) => authController.login(req, res));
authRouter.post('/refresh', authRateLimiter, validateRequest(RefreshSchema), (req, res) => authController.refresh(req, res));
authRouter.post('/reset-password', authRateLimiter, validateRequest(ResetPasswordSchema), (req, res) => authController.resetPassword(req, res));

// Protected routes
authRouter.post('/logout', authMiddleware.handle, (req, res) => authController.logout(req, res));
authRouter.get('/me', authMiddleware.handle, currentUserResolver.resolve, (req, res) => authController.getMe(req, res));

authRouter.patch('/profile',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => authController.updateProfile(req, res)
);

// API key management — session JWT only; an API key can never mint, list or revoke keys.
const apiKeysLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new FallbackRedisStore(redisAppClient, 'rl:api-keys:'),
  message: { error: 'Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.' },
});

authRouter.use('/api-keys', createApiKeysRouter({
  sessionHandlers: [authMiddleware.handle, currentUserResolver.resolve],
  limiter: apiKeysLimiter,
  controller: new ApiKeyController(apiKeyService),
}));

export { authRouter };
