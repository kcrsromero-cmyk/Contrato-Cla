import { Router } from 'express';
import { AuthController } from './AuthController';
import { AuthMiddleware } from './AuthMiddleware';
import { CurrentUserResolver } from './CurrentUserResolver';
import { IdentityService } from '../application/IdentityService';
import { SupabaseIdentityProvider } from '../infrastructure/SupabaseIdentityProvider';
import { IdentityProviderRegistry } from '../infrastructure/IdentityProviderRegistry';
import { JWTValidator } from '../infrastructure/JWTValidator';
import { prisma } from '../../../infrastructure/db/prisma';
import { AuditService } from '../../audit/application/AuditService';
import rateLimit from 'express-rate-limit';
import { validateRequest } from './ValidationMiddleware';
import { RegisterSchema, LoginSchema, RefreshSchema } from './AuthSchemas';

// Initialize router
const authRouter = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
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

// Create infrastructure validator
const jwtValidator = new JWTValidator(process.env.SUPABASE_JWKS_URL!);

// Create presentation components
const authController = new AuthController(identityService, auditService);
const authMiddleware = new AuthMiddleware(jwtValidator);
const currentUserResolver = new CurrentUserResolver(identityService);

// 2. Define Routes

// Public routes
authRouter.post('/register', authRateLimiter, validateRequest(RegisterSchema), (req, res) => authController.register(req, res));
authRouter.post('/login', authRateLimiter, validateRequest(LoginSchema), (req, res) => authController.login(req, res));
authRouter.post('/refresh', authRateLimiter, validateRequest(RefreshSchema), (req, res) => authController.refresh(req, res));

// Protected routes
authRouter.post('/logout', authMiddleware.handle, (req, res) => authController.logout(req, res));
authRouter.get('/me', authMiddleware.handle, currentUserResolver.resolve, (req, res) => authController.getMe(req, res));

authRouter.patch('/profile',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => authController.updateProfile(req, res)
);

export { authRouter };
