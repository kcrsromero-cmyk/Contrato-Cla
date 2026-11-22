import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyAuthMiddleware } from '../presentation/ApiKeyAuthMiddleware';
import { ApiAccessNotAllowedError, ApiKeyAuthenticationError } from '../domain/errors';

vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { logger } from '../../../infrastructure/logger';

const KEY = 'ctr360_' + 'A'.repeat(43);

describe('ApiKeyAuthMiddleware', () => {
  let apiKeys: any;
  let isFeatureEnabled: any;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    apiKeys = { authenticate: vi.fn(), recordUsage: vi.fn(async () => undefined) };
    isFeatureEnabled = vi.fn(async () => true);
    req = { headers: { authorization: 'Bearer ' + KEY } };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    next = vi.fn();
  });

  it('responds 503 and does not authenticate when API_ACCESS is disabled', async () => {
    isFeatureEnabled.mockResolvedValue(false);
    const middleware = new ApiKeyAuthMiddleware(apiKeys, isFeatureEnabled);

    await middleware.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.',
      code: 'FEATURE_DISABLED',
    });
    expect(apiKeys.authenticate).not.toHaveBeenCalled();
    expect(isFeatureEnabled).toHaveBeenCalledWith('API_ACCESS');
  });

  it('responds 401 when authentication throws ApiKeyAuthenticationError', async () => {
    apiKeys.authenticate.mockRejectedValue(new ApiKeyAuthenticationError());
    const middleware = new ApiKeyAuthMiddleware(apiKeys, isFeatureEnabled);

    await middleware.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'La clave de API es inválida o fue revocada.',
      code: 'INVALID_API_KEY',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when authentication throws ApiAccessNotAllowedError', async () => {
    apiKeys.authenticate.mockRejectedValue(new ApiAccessNotAllowedError());
    const middleware = new ApiKeyAuthMiddleware(apiKeys, isFeatureEnabled);

    await middleware.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Tu plan actual no incluye acceso por API.',
      code: 'API_ACCESS_NOT_IN_PLAN',
    });
  });

  it('attaches req.user and req.apiKey, calls next and records usage on success', async () => {
    const user = { id: 'user-1', email: 'u@test.com' };
    apiKeys.authenticate.mockResolvedValue({ apiKeyId: 'key-1', user, apiRequestsPerMinute: 60 });
    const middleware = new ApiKeyAuthMiddleware(apiKeys, isFeatureEnabled);

    await middleware.handle(req, res, next);

    expect(req.user).toBe(user);
    expect(req.apiKey).toEqual({ id: 'key-1', apiRequestsPerMinute: 60 });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(apiKeys.recordUsage).toHaveBeenCalledWith('key-1');
    expect(apiKeys.authenticate).toHaveBeenCalledWith(KEY);
  });

  it('still calls next and logs a warning when recordUsage rejects', async () => {
    const user = { id: 'user-1', email: 'u@test.com' };
    apiKeys.authenticate.mockResolvedValue({ apiKeyId: 'key-1', user, apiRequestsPerMinute: 60 });
    apiKeys.recordUsage.mockRejectedValue(new Error('db down'));
    const middleware = new ApiKeyAuthMiddleware(apiKeys, isFeatureEnabled);

    await middleware.handle(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(logger.warn).toHaveBeenCalledWith(
        'API key usage timestamp update failed',
        expect.objectContaining({ apiKeyId: 'key-1' }),
      ),
    );
  });

  it('responds 500 when authentication throws an unexpected error', async () => {
    apiKeys.authenticate.mockRejectedValue(new Error('boom'));
    const middleware = new ApiKeyAuthMiddleware(apiKeys, isFeatureEnabled);

    await middleware.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });
});
