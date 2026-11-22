import { describe, it, expect, vi } from 'vitest';
import { AuditMiddleware } from '../presentation/AuditMiddleware';

function buildReqRes(path: string, originalUrl: string) {
  const handlers: Record<string, () => void> = {};
  const req: any = {
    originalUrl,
    path,
    method: 'GET',
    ip: '1.2.3.4',
    socket: {},
    get: () => undefined,
  };
  const res: any = {
    statusCode: 200,
    on: (event: string, cb: () => void) => { handlers[event] = cb; },
  };
  return { req, res, finish: () => handlers.finish?.() };
}

describe('AuditMiddleware.logApiConsumption', () => {
  it('logs the route template, never req.originalUrl — the query string can carry sensitive identifiers', async () => {
    const auditService = { logAction: vi.fn(async () => undefined) } as any;
    const middleware = new AuditMiddleware(auditService);
    const { req, res, finish } = buildReqRes(
      '/api/v1/procurement/contracts',
      '/api/v1/procurement/contracts?codigoEntidad=123&documento=987654321',
    );
    req.baseUrl = '/api/v1/procurement';
    req.route = { path: '/contracts' };

    middleware.logApiConsumption(req, res, vi.fn());
    finish();

    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ resource: '/api/v1/procurement/contracts' }),
    );
  });

  it('logs the matched route template, never the resolved path param (e.g. a document number)', async () => {
    const auditService = { logAction: vi.fn(async () => undefined) } as any;
    const middleware = new AuditMiddleware(auditService);
    const { req, res, finish } = buildReqRes(
      '/api/v1/analytics/persons/123456789',
      '/api/v1/analytics/persons/123456789',
    );
    req.baseUrl = '/api/v1/analytics';
    req.route = { path: '/persons/:documentNumber' };

    middleware.logApiConsumption(req, res, vi.fn());
    finish();

    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ resource: '/api/v1/analytics/persons/:documentNumber' }),
    );
  });

  it('logs a fixed placeholder, never req.path, when no route matched (404) — the path itself could be a probed identifier', async () => {
    const auditService = { logAction: vi.fn(async () => undefined) } as any;
    const middleware = new AuditMiddleware(auditService);
    const { req, res, finish } = buildReqRes('/api/v1/persons/123456789', '/api/v1/persons/123456789');
    res.statusCode = 404;

    middleware.logApiConsumption(req, res, vi.fn());
    finish();

    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ resource: '(sin ruta coincidente)' }),
    );
  });
});
