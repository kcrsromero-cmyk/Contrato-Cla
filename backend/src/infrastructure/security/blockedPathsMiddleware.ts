import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para bloquear inmediatamente requests a rutas conocidas de scanners,
 * exploits PHP, credenciales cloud y archivos de configuración sensibles
 * antes de que consuman rate limits o generen registros en audit_log.
 */
export function blockedPathsMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = ((req as any).originalUrl || req.path).toLowerCase();

  // Bloquear extensiones PHP inmediatamente
  if (path.endsWith('.php') || path.includes('.php.') || path.includes('.php?')) {
    return res.status(404).end();
  }

  // Bloquear archivos de credenciales cloud
  const credentialFiles = [
    '/.aws', '/aws.env', '/gcp', '/google-key', '/google-credentials',
    '/firebase', '/keyfile.json', '/key.json', '/sa.json',
    '/credentials.json', '/service-account', '/.config/gcloud',
    '/application_defaultcredentials', '/gcp-credentials', '/gcp-key',
    '/firebase-key', '/firebase-adminsdk', '/service-account.json'
  ];

  // Bloquear archivos .env de CI/CD y servicios
  const envPaths = [
    '/github/.env', '/gitlab/.env', '/jenkins/.env', '/circleci/.env',
    '/travis/.env', '/buildkite/.env', '/mysql/.env', '/redis/.env',
    '/postgres/.env', '/mongodb/.env', '/rabbitmq/.env', '/kafka/.env',
    '/elasticsearch/.env', '/production/.env', '/staging/.env',
    '/test/.env', '/dev/.env', '/qa/.env', '/beta/.env', '/uat/.env',
    '/preview/.env', '/worker/.env', '/queue/.env', '/job/.env',
    '/.env', '/aws.env', '/.env.backup', '/.env.local', '/development/.env'
  ];

  // Bloquear paths de reconocimiento generales
  const blockedPaths = [
    // WordPress
    '/wp-login', '/wp-admin', '/wp-content', '/wp-includes',
    '/wp-json', '/wp/', '/wordpress', '/blog/wp-',
    '/xmlrpc.php', '/?rest_route=',
    '/wp/wordpress', '/blog/wordpress',

    // PHP genérico
    '/phpinfo', '/php-info', '/info.php', '/test.php',
    '/p.php', '/pi.php', '/i.php', '/php.php',
    '/pinfo.php', '/phpversion.php',
    '/server-status', '/server-info',

    // Archivos .env y configuración
    '/.env', '/aws.env', '/.env.backup', '/.env.local',
    '/production/.env', '/development/.env', '/staging/.env',

    // Credenciales cloud
    '/.aws/credentials', '/aws.env',
    '/.config/gcloud', '/gcp-credentials', '/gcp-key',
    '/firebase-key', '/firebase-adminsdk', '/credentials.json',
    '/service-account.json', '/keyfile.json',

    // Git y backups
    '/.git/config', '/.git/',
    '/backup.sql', '/dump.sql', '/database.sql', '/db.sql',
    '/config.bak', '/.htaccess',

    // Rutas de ataque genéricas
    '/license.txt', '/haan', '/bank',
    '/readme.html',

    // Rutas adicionales de reconocimiento
    '/debug', '/phpmyadmin', '/admin', '/.git', '/config',
    '/info', '/_profiler', '/_environment', '/firebase', '/keyfile',
    '/service-account', '/credentials', '/.config'
  ];

  const isBlocked =
    credentialFiles.some(p => path.startsWith(p) || path.includes(p)) ||
    envPaths.some(p => path === p) ||
    blockedPaths.some(p => path.startsWith(p) || path.includes('rest_route='));

  if (isBlocked) {
    return res.status(404).end();
  }

  next();
}
