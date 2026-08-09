import { Router } from 'express';
import { ContractController } from './ContractController';
import { ContractService } from '../application/ContractService';
import { SocrataContractProvider } from '../infrastructure/SocrataContractProvider';
import { ContractProviderRegistry } from '../infrastructure/ProviderRegistry';

const contractRouter = Router();

// 1. Wiring (Dependency Injection)
const socrataProvider = new SocrataContractProvider();
ContractProviderRegistry.register('socrata', socrataProvider);

const activeProvider = ContractProviderRegistry.resolve();
const contractService = new ContractService(activeProvider);
const contractController = new ContractController(contractService);

// 2. Define Routes
contractRouter.get('/', (req, res) => contractController.getContracts(req, res));

export { contractRouter };
