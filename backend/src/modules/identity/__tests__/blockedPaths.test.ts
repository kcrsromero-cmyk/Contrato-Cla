import { describe, it, expect, vi } from 'vitest';
import { blockedPathsMiddleware } from '../../../infrastructure/security/blockedPathsMiddleware';

describe('BlockedPaths Middleware', () => {
  const middleware = blockedPathsMiddleware;

  const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.end = vi.fn().mockReturnValue(res);
    return res;
  };

  it('should allow clean application paths', () => {
    const validPaths = [
      '/api/v1/procurement/contracts',
      '/api/v1/auth/me',
      '/api/v1/analytics/overview',
      '/api/v1/user/credentials-list' // should not match prefix /credentials because it starts with /api
    ];

    validPaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  it('should block PHP file extensions and patterns', () => {
    const phpPaths = [
      '/index.php',
      '/test.php.bak',
      '/api/v1/test.php',
      '/info.php?foo=bar'
    ];

    phpPaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should block WordPress scan paths via prefix, exact, or query matching', () => {
    const wpPaths = [
      '/wp-login.php',
      '/wp-admin/index.php',
      '/wp-content/plugins',
      '/wp-includes/js',
      '/wp-json/batch/v1',
      '/blog/wp-login.php',
      '/?rest_route=/wp/v2',
      '/wp/wordpress',
      '/blog/wordpress'
    ];

    wpPaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should block generic PHP scan paths', () => {
    const phpPaths = [
      '/phpinfo',
      '/php-info',
      '/info.php',
      '/test.php',
      '/p.php',
      '/pi.php',
      '/i.php',
      '/php.php',
      '/pinfo.php',
      '/phpversion.php',
      '/server-status',
      '/server-info'
    ];

    phpPaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should block .env and configuration files', () => {
    const envFilePaths = [
      '/.env',
      '/aws.env',
      '/.env.backup',
      '/.env.local',
      '/production/.env',
      '/development/.env',
      '/staging/.env'
    ];

    envFilePaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should block cloud credential files', () => {
    const cloudPaths = [
      '/.aws/credentials',
      '/aws.env',
      '/.config/gcloud',
      '/gcp-credentials',
      '/gcp-key',
      '/firebase-key',
      '/firebase-adminsdk',
      '/credentials.json',
      '/service-account.json',
      '/keyfile.json',
      '/credentials/stolen-key',
      '/firebase/config'
    ];

    cloudPaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should block Git and database dump / backup files', () => {
    const gitBackupPaths = [
      '/.git/config',
      '/.git/HEAD',
      '/backup.sql',
      '/dump.sql',
      '/database.sql',
      '/db.sql',
      '/config.bak',
      '/.htaccess'
    ];

    gitBackupPaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should block generic attack paths', () => {
    const genericAttackPaths = [
      '/license.txt',
      '/haan',
      '/bank',
      '/readme.html'
    ];

    genericAttackPaths.forEach(path => {
      const req: any = { originalUrl: path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should only check queryPatterns on query strings, not path names', () => {
    // path containing 'rest_route=' without ?
    const req1: any = { originalUrl: '/api/v1/rest_route=something' };
    const res1 = mockResponse();
    const next1 = vi.fn();

    middleware(req1, res1, next1);
    expect(next1).toHaveBeenCalled();

    // query string containing rest_route=
    const req2: any = { originalUrl: '/index?rest_route=123' };
    const res2 = mockResponse();
    const next2 = vi.fn();

    middleware(req2, res2, next2);
    expect(res2.status).toHaveBeenCalledWith(404);
    expect(next2).not.toHaveBeenCalled();
  });
});
