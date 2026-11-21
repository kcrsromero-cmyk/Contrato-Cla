import { Router } from 'express';
import { AnalyticsController } from './AnalyticsController';
import { AnalyticsService } from '../application/AnalyticsService';
import { prisma } from '../../../infrastructure/db/prisma';
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { CurrentUserResolver } from '../../identity/presentation/CurrentUserResolver';
import { jwtValidator } from '../../../infrastructure/security/jwtValidator';
import { IdentityService } from '../../identity/application/IdentityService';
import { IdentityProviderRegistry } from '../../identity/infrastructure/IdentityProviderRegistry';
import { requireCapability } from '../../identity/presentation/requireCapability';
import { requireFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';
import { authenticateApiKeyOrSession } from '../../identity/presentation/apiKeyAuth';

const analyticsRouter = Router();

const analyticsService = new AnalyticsService(prisma);
const analyticsController = new AnalyticsController(analyticsService);

const authMiddleware = new AuthMiddleware(jwtValidator);
const activeProvider = IdentityProviderRegistry.resolve();
const identityService = new IdentityService(activeProvider);
const currentUserResolver = new CurrentUserResolver(identityService);
const authenticate = authenticateApiKeyOrSession([authMiddleware.handle, currentUserResolver.resolve]);

const requireAnalytics = requireCapability('USE_ANALYTICS');
const requireAnalyticsEnabled = requireFeatureEnabled('ANALYTICS');

analyticsRouter.get('/persons/supplier-doc-types', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getSupplierDocTypes(req, res));
analyticsRouter.get('/persons/:documentNumber', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getPersonActivity(req, res));
analyticsRouter.get('/suppliers/top-by-count', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getTopSuppliersByCount(req, res));
analyticsRouter.get('/suppliers/top-by-value', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getTopSuppliersByValue(req, res));
analyticsRouter.get('/departments/contracts', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getContractsPerDepartment(req, res));
analyticsRouter.get('/departments/spending', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getSpendingPerDepartment(req, res));
analyticsRouter.get('/contracts/by-modality', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getContractsPerModality(req, res));
analyticsRouter.get('/contracts/by-type', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getContractsPerType(req, res));
analyticsRouter.get('/contracts/by-status', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getContractsByStatus(req, res));
analyticsRouter.get('/entities/top-by-count', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getTopEntitiesByContractCount(req, res));
analyticsRouter.get('/entities/top-by-spending', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getTopEntitiesBySpending(req, res));
analyticsRouter.get('/contracts/trends', authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res) => analyticsController.getContractTrends(req, res));

export { analyticsRouter };
