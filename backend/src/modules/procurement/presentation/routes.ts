import { Router } from 'express';
import { ProcurementController } from './ProcurementController';
import { ProcurementService } from '../application/ProcurementService';
import { SocrataContractProvider } from '../infrastructure/SocrataContractProvider';
// Import auth middlewares to protect routes
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { CurrentUserResolver } from '../../identity/presentation/CurrentUserResolver';
import { IdentityService } from '../../identity/application/IdentityService';
import { IdentityProviderRegistry } from '../../identity/infrastructure/IdentityProviderRegistry';
import { JWTValidator } from '../../identity/infrastructure/JWTValidator';

const procurementRouter = Router();

const socrataProvider = new SocrataContractProvider();
const procurementService = new ProcurementService(socrataProvider);
const procurementController = new ProcurementController(procurementService);

// Setting up auth dependencies (simplified for route setup)
const activeProvider = IdentityProviderRegistry.resolve();
const identityService = new IdentityService(activeProvider);
const jwtValidator = new JWTValidator(process.env.SUPABASE_JWKS_URL!);
const authMiddleware = new AuthMiddleware(jwtValidator);
const currentUserResolver = new CurrentUserResolver(identityService);


procurementRouter.get('/departments', (req, res) => procurementController.getDepartments(req, res));
procurementRouter.get('/cities', (req, res) => procurementController.getCities(req, res));
procurementRouter.get('/entities', (req, res) => procurementController.getEntities(req, res));
procurementRouter.get('/entities/search', (req, res) => procurementController.searchEntities(req, res));
procurementRouter.get('/years', (req, res) => procurementController.getContractYears(req, res));

procurementRouter.get('/contracts', (req, res) => procurementController.getContracts(req, res));

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

procurementRouter.delete('/favorite-entities/:entityCode',
  authMiddleware.handle,
  currentUserResolver.resolve,
  (req, res) => procurementController.removeFavoriteEntity(req, res)
);

export { procurementRouter };
