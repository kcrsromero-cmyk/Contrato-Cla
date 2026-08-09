import { Router } from 'express';
import { AuthController } from './AuthController';
import { AuthMiddleware } from './AuthMiddleware';
import { CurrentUserResolver } from './CurrentUserResolver';
import { IdentityService } from '../application/IdentityService';
import { SupabaseIdentityProvider } from '../infrastructure/SupabaseIdentityProvider';
import { IdentityProviderRegistry } from '../infrastructure/IdentityProviderRegistry';
import { JWTValidator } from '../infrastructure/JWTValidator';

// Initialize router
const authRouter = Router();

// 1. Setup Dependencies (Wiring)
// In a real application, this might be handled by a DI container (like Awilix or NestJS)
// For now, we wire them manually.

const supabaseProvider = new SupabaseIdentityProvider();
// Register the provider
IdentityProviderRegistry.register('supabase', supabaseProvider);

// Resolve the default provider
const activeProvider = IdentityProviderRegistry.resolve();

// Create application service
const identityService = new IdentityService(activeProvider);

// Create infrastructure validator
const jwtValidator = new JWTValidator();

// Create presentation components
const authController = new AuthController(identityService);
const authMiddleware = new AuthMiddleware(jwtValidator);
const currentUserResolver = new CurrentUserResolver(identityService);

// 2. Define Routes

// Public routes
authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.post('/refresh', (req, res) => authController.refresh(req, res));

// Protected routes
authRouter.post('/logout', authMiddleware.handle, (req, res) => authController.logout(req, res));
authRouter.get('/me', authMiddleware.handle, currentUserResolver.resolve, (req, res) => authController.getMe(req, res));

export { authRouter };
