import { Router } from 'express';
import { AnalyticsController } from './AnalyticsController';
import { AnalyticsService } from '../application/AnalyticsService';
import { prisma } from '../../../infrastructure/db/prisma';
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { CurrentUserResolver } from '../../identity/presentation/CurrentUserResolver';
import { JWTValidator } from '../../identity/infrastructure/JWTValidator';
import { IdentityService } from '../../identity/application/IdentityService';
import { IdentityProviderRegistry } from '../../identity/infrastructure/IdentityProviderRegistry';
import { requireCapability } from '../../identity/presentation/requireCapability';

const analyticsRouter = Router();

const analyticsService = new AnalyticsService(prisma);
const analyticsController = new AnalyticsController(analyticsService);

const jwtValidator = new JWTValidator(process.env.SUPABASE_JWKS_URL || '');
const authMiddleware = new AuthMiddleware(jwtValidator);
const activeProvider = IdentityProviderRegistry.resolve();
const identityService = new IdentityService(activeProvider);
const currentUserResolver = new CurrentUserResolver(identityService);

const requireAnalytics = requireCapability('USE_ANALYTICS');

analyticsRouter.get('/persons/supplier-doc-types', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getSupplierDocTypes(req, res));
analyticsRouter.get('/persons/:documentNumber', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getPersonActivity(req, res));
analyticsRouter.get('/suppliers/top-by-count', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getTopSuppliersByCount(req, res));
analyticsRouter.get('/suppliers/top-by-value', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getTopSuppliersByValue(req, res));
analyticsRouter.get('/departments/contracts', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getContractsPerDepartment(req, res));
analyticsRouter.get('/departments/spending', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getSpendingPerDepartment(req, res));
analyticsRouter.get('/contracts/by-modality', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getContractsPerModality(req, res));
analyticsRouter.get('/contracts/by-type', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getContractsPerType(req, res));
analyticsRouter.get('/contracts/by-status', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getContractsByStatus(req, res));
analyticsRouter.get('/entities/top-by-count', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getTopEntitiesByContractCount(req, res));
analyticsRouter.get('/entities/top-by-spending', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getTopEntitiesBySpending(req, res));
analyticsRouter.get('/contracts/trends', authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, (req, res) => analyticsController.getContractTrends(req, res));

export { analyticsRouter };
