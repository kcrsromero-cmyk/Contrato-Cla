import { Router } from 'express';
import { ProcurementController } from './ProcurementController';
import { ProcurementService } from '../application/ProcurementService';
import { SocrataContractProvider } from '../infrastructure/SocrataContractProvider';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
// Import auth middlewares to protect routes
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { CurrentUserResolver } from '../../identity/presentation/CurrentUserResolver';
import { IdentityService } from '../../identity/application/IdentityService';
import { IdentityProviderRegistry } from '../../identity/infrastructure/IdentityProviderRegistry';
import { jwtValidator } from '../../../infrastructure/security/jwtValidator';

const procurementRouter = Router();

const socrataProvider = new SocrataContractProvider();
const procurementService = new ProcurementService(socrataProvider);
const procurementController = new ProcurementController(procurementService);

const contractsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisAppClient.call(args[0], ...args.slice(1)) as Promise<any>,
    prefix: 'rl:contracts:'
  }),
  message: { error: 'Too many contract queries, please try again in a minute.' }
});

const searchEntitiesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisAppClient.call(args[0], ...args.slice(1)) as Promise<any>,
    prefix: 'rl:search:'
  }),
  message: { error: 'Too many search requests, please try again in a minute.' }
});

// Setting up auth dependencies (simplified for route setup)
const activeProvider = IdentityProviderRegistry.resolve();
const identityService = new IdentityService(activeProvider);
const authMiddleware = new AuthMiddleware(jwtValidator);
const currentUserResolver = new CurrentUserResolver(identityService);


procurementRouter.get('/departments', (req, res) => procurementController.getDepartments(req, res));
procurementRouter.get('/cities', (req, res) => procurementController.getCities(req, res));
procurementRouter.get('/entities', (req, res) => procurementController.getEntities(req, res));
procurementRouter.get('/entities/search', searchEntitiesLimiter, (req, res) => procurementController.searchEntities(req, res));
procurementRouter.get('/years', (req, res) => procurementController.getContractYears(req, res));

procurementRouter.get('/contracts', contractsLimiter, (req, res) => procurementController.getContracts(req, res));

procurementRouter.get('/similarity',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.calculateSimilarity(req, res)
);

// Protected route (E2E for capabilities)
procurementRouter.post('/favorites',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.addFavorite(req, res)
);

procurementRouter.get('/favorites',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.getFavorites(req, res)
);

procurementRouter.delete('/favorites',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.removeFavoriteContract(req, res)
);

procurementRouter.post('/favorite-entities',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.addFavoriteEntity(req, res)
);

procurementRouter.get('/favorite-entities',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.getFavoriteEntities(req, res)
);

procurementRouter.delete('/favorite-entities',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.removeFavoriteEntity(req, res)
);

export { procurementRouter };
