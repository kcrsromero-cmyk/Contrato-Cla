import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BillingController } from './BillingController';
import { SubscriptionService } from '../application/SubscriptionService';
import { PrismaSubscriptionRepository } from '../infrastructure/PrismaSubscriptionRepository';
import { MercadoPagoBillingProvider } from '../infrastructure/MercadoPagoBillingProvider';
import { BillingProviderRegistry } from '../infrastructure/BillingProviderRegistry';
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { CurrentUserResolver } from '../../identity/presentation/CurrentUserResolver';
import { JWTValidator } from '../../identity/infrastructure/JWTValidator';
import { IdentityService } from '../../identity/application/IdentityService';
import { SupabaseIdentityProvider } from '../../identity/infrastructure/SupabaseIdentityProvider';
import { PrismaUserRepository } from '../../identity/infrastructure/PrismaUserRepository';
import { PrismaOrganizationRepository } from '../../identity/infrastructure/PrismaOrganizationRepository';

const billingRouter = Router();

// Wiring
const prisma = new PrismaClient();
const subscriptionRepository = new PrismaSubscriptionRepository(prisma);

const mercadopagoProvider = new MercadoPagoBillingProvider();
BillingProviderRegistry.register('mercadopago', mercadopagoProvider);

const activeBillingProvider = BillingProviderRegistry.resolve();
const subscriptionService = new SubscriptionService(activeBillingProvider, subscriptionRepository);
const billingController = new BillingController(subscriptionService);

// We need AuthMiddleware and CurrentUserResolver to protect the subscribe endpoint
// (In a real app, DI handles this cleanly)
const jwtValidator = new JWTValidator();
const authMiddleware = new AuthMiddleware(jwtValidator);
const identityProvider = new SupabaseIdentityProvider();
const userRepository = new PrismaUserRepository(prisma);
const organizationRepository = new PrismaOrganizationRepository(prisma);
const identityService = new IdentityService(identityProvider, userRepository, organizationRepository);
const currentUserResolver = new CurrentUserResolver(identityService);

// Routes
billingRouter.post(
  '/subscribe',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => billingController.subscribe(req, res)
);

billingRouter.post(
  '/webhooks/mercadopago',
  (req, res) => billingController.mercadopagoWebhook(req, res)
);

export { billingRouter };
