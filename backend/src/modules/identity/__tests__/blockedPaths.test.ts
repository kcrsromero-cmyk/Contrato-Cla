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
      '/api/v1/analytics/overview'
    ];

    validPaths.forEach(path => {
      const req: any = { path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
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

  it('should block WordPress scan paths', () => {
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
      const req: any = { path };
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
      const req: any = { path };
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
      const req: any = { path };
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
      '/keyfile.json'
    ];

    cloudPaths.forEach(path => {
      const req: any = { path };
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
      const req: any = { path };
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
      const req: any = { path };
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
