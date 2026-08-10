import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AIController } from './AIController';
import { AIService } from '../application/AIService';
import { OpenAIAIProvider } from '../infrastructure/OpenAIAIProvider';
import { PrismaAIRequestRepository } from '../infrastructure/PrismaAIRequestRepository';
import { AIProviderRegistry } from '../infrastructure/AIProviderRegistry';
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { CurrentUserResolver } from '../../identity/presentation/CurrentUserResolver';
import { JWTValidator } from '../../identity/infrastructure/JWTValidator';
import { IdentityService } from '../../identity/application/IdentityService';
import { SupabaseIdentityProvider } from '../../identity/infrastructure/SupabaseIdentityProvider';
import { PrismaUserRepository } from '../../identity/infrastructure/PrismaUserRepository';
import { PrismaOrganizationRepository } from '../../identity/infrastructure/PrismaOrganizationRepository';

const aiRouter = Router();

// Wiring
const prisma = new PrismaClient();
const aiRequestRepository = new PrismaAIRequestRepository(prisma);

const openAiProvider = new OpenAIAIProvider();
AIProviderRegistry.register('openai', openAiProvider);

const activeAiProvider = AIProviderRegistry.resolve();
const aiService = new AIService(activeAiProvider, aiRequestRepository);
const aiController = new AIController(aiService);

// We need AuthMiddleware and CurrentUserResolver to protect the endpoint and get user.id/organizationId
const jwtValidator = new JWTValidator();
const authMiddleware = new AuthMiddleware(jwtValidator);
const identityProvider = new SupabaseIdentityProvider();
const userRepository = new PrismaUserRepository(prisma);
const organizationRepository = new PrismaOrganizationRepository(prisma);
const identityService = new IdentityService(identityProvider, userRepository, organizationRepository);
const currentUserResolver = new CurrentUserResolver(identityService);

// Routes
aiRouter.post(
  '/analyze-contract',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => aiController.analyzeContract(req, res)
);

export { aiRouter };
