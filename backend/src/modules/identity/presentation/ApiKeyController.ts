import { Request, Response } from 'express';
import { logger } from '../../../infrastructure/logger';
import { ApiKeyNotFoundError } from '../domain/errors';
import type { ApiKeySummary, IssuedApiKey } from '../application/ApiKeyService';
import { ApiKeyIdSchema, CreateApiKeySchema } from './ApiKeySchemas';

export interface ApiKeyManager {
  issue(userId: string, name: string): Promise<IssuedApiKey>;
  listForUser(userId: string): Promise<ApiKeySummary[]>;
  revoke(userId: string, apiKeyId: string): Promise<ApiKeySummary>;
}

const notFound = (res: Response) => {
  const error = new ApiKeyNotFoundError();
  return res.status(404).json({ error: error.message, code: error.code });
};

export class ApiKeyController {
  constructor(private readonly apiKeys: ApiKeyManager) {}

  async create(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = CreateApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    try {
      const issued = await this.apiKeys.issue(user.id, parsed.data.name);
      return res.status(201).json(issued);
    } catch (error) {
      return this.fail(res, user.id, error);
    }
  }

  async list(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const apiKeys = await this.apiKeys.listForUser(user.id);
      return res.status(200).json({ apiKeys });
    } catch (error) {
      return this.fail(res, user.id, error);
    }
  }

  async revoke(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = ApiKeyIdSchema.safeParse(req.params.id);
    if (!parsed.success) return notFound(res);

    try {
      const summary = await this.apiKeys.revoke(user.id, parsed.data);
      return res.status(200).json(summary);
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) return notFound(res);
      return this.fail(res, user.id, error);
    }
  }

  private fail(res: Response, userId: string, error: unknown) {
    logger.error('API key endpoint error', { userId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
