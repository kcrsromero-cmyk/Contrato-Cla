import { Router, RequestHandler } from 'express';
import { requireCapability } from './requireCapability';
import { validateRequest } from './ValidationMiddleware';
import { requireSessionAuth } from './authenticateApiKeyOrSession';
import { CreateApiKeySchema } from './ApiKeySchemas';
import { ApiKeyController } from './ApiKeyController';

export interface ApiKeysRouterDeps {
  sessionHandlers: RequestHandler[];
  limiter: RequestHandler;
  controller: ApiKeyController;
}

/** Session JWT only on every route: requireSessionAuth runs before the JWT is parsed. */
export const createApiKeysRouter = ({ sessionHandlers, limiter, controller }: ApiKeysRouterDeps): Router => {
  const router = Router();

  router.post('/', requireSessionAuth, ...sessionHandlers, limiter, requireCapability('USE_API'), validateRequest(CreateApiKeySchema), (req, res) => controller.create(req, res));
  router.get('/', requireSessionAuth, ...sessionHandlers, limiter, (req, res) => controller.list(req, res));
  router.delete('/:id', requireSessionAuth, ...sessionHandlers, limiter, (req, res) => controller.revoke(req, res));

  return router;
};
