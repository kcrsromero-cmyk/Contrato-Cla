import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { logger } from '../../../infrastructure/logger';
import { ApiKeyController } from '../presentation/ApiKeyController';
import { ApiKeyNotFoundError } from '../domain/errors';

const KEY_ID = '3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c';

describe('ApiKeyController', () => {
  let manager: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = { issue: vi.fn(), listForUser: vi.fn(), revoke: vi.fn() };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  });

  describe('create', () => {
    it('trims the name and responds 201 with the issued key', async () => {
      const controller = new ApiKeyController(manager);
      const issued = { id: KEY_ID, name: 'ERP', keyPrefix: 'ck_live_AbCd', createdAt: new Date(), key: 'ck_live_x' };
      manager.issue.mockResolvedValue(issued);
      const req: any = { user: { id: 'user-1' }, body: { name: '  ERP  ' } };

      await controller.create(req, res);

      expect(manager.issue).toHaveBeenCalledWith('user-1', 'ERP');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(issued);
    });

    it('responds 401 without req.user and calls no service method', async () => {
      const controller = new ApiKeyController(manager);
      const req: any = { body: { name: 'ERP' } };

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(manager.issue).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('responds 200 with the service summaries', async () => {
      const controller = new ApiKeyController(manager);
      const summaries = [{ id: KEY_ID, name: 'ERP', keyPrefix: 'ck_live_AbCd', createdAt: new Date(), lastUsedAt: null, revokedAt: null }];
      manager.listForUser.mockResolvedValue(summaries);
      const req: any = { user: { id: 'user-1' } };

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ apiKeys: summaries });
    });

    it('responds 401 without req.user and calls no service method', async () => {
      const controller = new ApiKeyController(manager);
      const req: any = {};

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(manager.listForUser).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('responds 401 without req.user and calls no service method', async () => {
      const controller = new ApiKeyController(manager);
      const req: any = { params: { id: KEY_ID } };

      await controller.revoke(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(manager.revoke).not.toHaveBeenCalled();
    });

    it('responds 404 when the id is not UUID-shaped', async () => {
      const controller = new ApiKeyController(manager);
      const req: any = { user: { id: 'user-1' }, params: { id: 'not-a-uuid' } };

      await controller.revoke(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' });
      expect(manager.revoke).not.toHaveBeenCalled();
    });

    it('responds 404 when the manager throws ApiKeyNotFoundError', async () => {
      const controller = new ApiKeyController(manager);
      manager.revoke.mockRejectedValue(new ApiKeyNotFoundError());
      const req: any = { user: { id: 'user-1' }, params: { id: KEY_ID } };

      await controller.revoke(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' });
    });

    it('responds 500 and logs when the manager throws any other error', async () => {
      const controller = new ApiKeyController(manager);
      manager.revoke.mockRejectedValue(new Error('db'));
      const req: any = { user: { id: 'user-1' }, params: { id: KEY_ID } };

      await controller.revoke(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
      expect(logger.error).toHaveBeenCalledWith('API key endpoint error', expect.objectContaining({ userId: 'user-1' }));
    });
  });
});
