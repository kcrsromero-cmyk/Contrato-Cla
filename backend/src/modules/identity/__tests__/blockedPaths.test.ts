import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Extract middleware function or simulate blocked paths logic
function createBlockedPathsMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path.toLowerCase();

    // Bloquear extensiones PHP inmediatamente
    if (path.endsWith('.php') || path.includes('.php.')) {
      return res.status(404).end();
    }

    // Bloquear archivos de credenciales cloud
    const credentialFiles = [
      '/.aws', '/aws.env', '/gcp', '/google-key', '/google-credentials',
      '/firebase', '/keyfile.json', '/key.json', '/sa.json',
      '/credentials.json', '/service-account', '/.config/gcloud',
      '/application_default_credentials'
    ];

    // Bloquear archivos .env de CI/CD y servicios
    const envPaths = [
      '/github/.env', '/gitlab/.env', '/jenkins/.env', '/circleci/.env',
      '/travis/.env', '/buildkite/.env', '/mysql/.env', '/redis/.env',
      '/postgres/.env', '/mongodb/.env', '/rabbitmq/.env', '/kafka/.env',
      '/elasticsearch/.env', '/production/.env', '/staging/.env',
      '/test/.env', '/dev/.env', '/qa/.env', '/beta/.env', '/uat/.env',
      '/preview/.env', '/worker/.env', '/queue/.env', '/job/.env'
    ];

    // Bloquear paths de reconocimiento generales
    const blockedPaths = [
      '/debug', '/.env', '/wp-admin', '/phpmyadmin',
      '/admin', '/.git', '/config',
      '/wp-login.php', '/xmlrpc.php', '/wp-json',
      '/.aws', '/aws.env', '/license.txt',
      '/bank', '/haan', '/info', '/server-status',
      '/server-info', '/_profiler', '/_environment',
      '/firebase', '/keyfile', '/service-account',
      '/credentials', '/.config'
    ];

    const isBlocked =
      credentialFiles.some(p => path.startsWith(p) || path.includes(p)) ||
      envPaths.some(p => path === p) ||
      blockedPaths.some(p => path.startsWith(p));

    if (isBlocked) {
      return res.status(404).end();
    }

    next();
  };
}

describe('BlockedPaths Middleware', () => {
  const middleware = createBlockedPathsMiddleware();

  const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.end = vi.fn().mockReturnValue(res);
    return res;
  };

  it('should allow clean application paths', () => {
    const req: any = { path: '/api/v1/procurement/contracts' };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block PHP file extensions', () => {
    const req: any = { path: '/index.php' };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should block PHP in path parameters', () => {
    const req: any = { path: '/test.php.bak' };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should block cloud credential files', () => {
    const req: any = { path: '/.aws/credentials' };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should block CI/CD .env files', () => {
    const req: any = { path: '/production/.env' };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should block general reconnaissance paths', () => {
    const req: any = { path: '/wp-admin/index.html' };
    const res = mockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
