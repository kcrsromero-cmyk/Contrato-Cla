import { Router } from 'express';
import { ContractController } from './ContractController';
import { ContractService } from '../application/ContractService';
import { SocrataContractProvider } from '../infrastructure/SocrataContractProvider';
import { ContractProviderRegistry } from '../infrastructure/ProviderRegistry';
import { AuthMiddleware } from '../../identity/presentation/AuthMiddleware';
import { JWTValidator } from '../../identity/infrastructure/JWTValidator';

const contractRouter = Router();
const jwtValidator = new JWTValidator();
const authMiddleware = new AuthMiddleware(jwtValidator);

// 1. Wiring (Dependency Injection)
const socrataProvider = new SocrataContractProvider();
ContractProviderRegistry.register('socrata', socrataProvider);

const activeProvider = ContractProviderRegistry.resolve();
const contractService = new ContractService(activeProvider);
const contractController = new ContractController(contractService);

// 2. Define Routes
contractRouter.get('/', authMiddleware.handle, (req, res) => contractController.getContracts(req, res));

export { contractRouter };
