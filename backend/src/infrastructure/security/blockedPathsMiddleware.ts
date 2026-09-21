import { Request, Response, NextFunction } from 'express';

// exactPaths — solo match exacto
const exactPaths = [
  '/.env',
  '/.env.backup',
  '/.env.local',
  '/aws.env',
  '/production/.env',
  '/development/.env',
  '/staging/.env',
  '/test/.env',
  '/dev/.env',
  '/qa/.env',
  '/beta/.env',
  '/uat/.env',
  '/preview/.env',
  '/worker/.env',
  '/queue/.env',
  '/job/.env',
  '/github/.env',
  '/gitlab/.env',
  '/jenkins/.env',
  '/circleci/.env',
  '/travis/.env',
  '/buildkite/.env',
  '/mysql/.env',
  '/redis/.env',
  '/postgres/.env',
  '/mongodb/.env',
  '/rabbitmq/.env',
  '/kafka/.env',
  '/elasticsearch/.env',
  '/keyfile.json',
  '/key.json',
  '/sa.json',
  '/credentials.json',
  '/service-account.json',
  '/application_defaultcredentials',
  '/.htaccess',
  '/license.txt',
  '/readme.html',
  '/server-status',
  '/server-info',
  '/haan',
  '/bank',
  '/signin',
  '/signup',
  '/register',
  '/dashboard',
  '/account',
  '/auth/callback',
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/register'
];

// prefixPaths — solo startsWith
const prefixPaths = [
  // WordPress
  '/wp-login',
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/wp-json',
  '/wp/',
  '/wordpress',
  '/blog/wp-',
  '/wp/wordpress',
  '/blog/wordpress',

  // Cloud & Credentials
  '/.aws',
  '/gcp',
  '/google-key',
  '/google-credentials',
  '/firebase',
  '/keyfile',
  '/service-account',
  '/credentials',
  '/.config',
  '/gcp-credentials',
  '/gcp-key',
  '/firebase-key',
  '/firebase-adminsdk',

  // Recon & Admin
  '/.git',
  '/.git/',
  '/debug',
  '/phpmyadmin',
  '/admin',
  '/config',
  '/info',
  '/_profiler',
  '/_environment',
  '/phpinfo',
  '/php-info'
];

// filePatterns — regex
const filePatterns = [
  /\.php$/i,
  /\.php\./i,
  /\.sql$/i,
  /\.bak$/i,
  /\/\.env(\.|$|~|_|\d)/i,
  /\/_environment/i
];

// queryPatterns — includes solo en query string
const queryPatterns = [
  'rest_route='
];

/**
 * Middleware para bloquear inmediatamente requests a rutas conocidas de scanners,
 * exploits PHP, credenciales cloud y archivos de configuración sensibles
 * antes de que consuman rate limits o generen registros en audit_log.
 */
export function blockedPathsMiddleware(req: Request, res: Response, next: NextFunction) {
  const rawUrl = ((req as any).originalUrl || req.url || req.path || '').toLowerCase();
  const [path, queryString = ''] = rawUrl.split('?');

  const isBlocked =
    exactPaths.includes(path) ||
    prefixPaths.some(prefix => path.startsWith(prefix)) ||
    filePatterns.some(pattern => pattern.test(path)) ||
    queryPatterns.some(query => queryString.includes(query));

  if (isBlocked) {
    return res.status(404).end();
  }

  next();
}
