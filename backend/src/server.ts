import { config } from './infrastructure/config/env';
import { logger } from './infrastructure/logger';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { FallbackRedisStore } from './infrastructure/security/rateLimitStore';
import { redisAppClient } from './infrastructure/redis/redisAppClient';
import { prisma } from './infrastructure/db/prisma';
import { AuditService } from './modules/audit/application/AuditService';
import { AuditMiddleware } from './modules/audit/presentation/AuditMiddleware';
import { blockedPathsMiddleware } from './infrastructure/security/blockedPathsMiddleware';
import { healthCheckHandler } from './modules/health/presentation/healthController';
import { identifyApiKey } from './modules/identity/presentation/apiKeyAuth';
import { isApiKeyAuthorization } from './modules/identity/domain/ApiKey';

const app = express();

// Confiar en el proxy de Traefik (primer proxy en la cadena)
app.set('trust proxy', 1);

const port = config.PORT;
const frontendUrl = config.FRONTEND_URL;

const auditService = new AuditService(prisma);
const auditMiddleware = new AuditMiddleware(auditService);

// Seguridad de headers HTTP
app.use(helmet());

// Bloquear rutas de scanners ANTES de llegar a cualquier middleware de rate limit o audit_log
app.use(blockedPathsMiddleware);

const API_PREFIX = '/api/v1';

// Real Health Check Routes (ANTES del rate limiter global)
app.get('/health/live', healthCheckHandler);
app.get('/health/ready', healthCheckHandler);

// Freno de último recurso, por IP, contra un diluvio de solicitudes con forma de clave de API
// — ANTES de que identifyApiKey consulte Postgres. No distingue válidas de inválidas (eso ya
// lo hace identifyApiKey, que además deja de consultar Postgres por sí solo para una IP con
// muchos intentos inválidos recientes — ver AUTH_FAILURE_WINDOW_SECONDS en apiKeyAuth.ts), así
// que el techo tiene que quedar muy por encima de cualquier plan real (ENTERPRISE llega a
// 600/min) para no bloquear jamás a un cliente legítimo que paga por más consumo — ese es
// exactamente el error que cometimos la primera vez con esto. Una sesión normal nunca pasa por
// aquí (el `skip` solo cuenta tokens con forma de clave de API).
const apiKeyAuthAttemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  store: new FallbackRedisStore(redisAppClient, 'rl:apikey-auth-attempt:'),
  skip: (req) => !isApiKeyAuthorization(req.headers.authorization),
  message: { error: 'Demasiados intentos de autenticación con clave de API desde esta IP.' },
});

app.use(apiKeyAuthAttemptLimiter);

// Autentica una API key una sola vez por solicitud, antes de que exista una ruta — el `skip`
// del limitador global, ApiKeyAuthMiddleware y los limitadores por ruta reutilizan el
// resultado (req.apiKey/req.user) en vez de volver a consultar Postgres cada uno.
app.use(identifyApiKey);

// Rate limit global — 500 requests por IP cada 15 minutos.
// Las solicitudes con una API key YA AUTENTICADA por identifyApiKey (req.apiKey) quedan
// exentas: su propio límite por plan (apiKeyRateLimiter / identityAwareRateLimiter, hasta
// 600/min en ENTERPRISE) ya las protege. Nunca se exime solo por el formato `ctr360_` — eso
// permitiría fabricar una clave falsa para eludir este límite sin autenticarse de verdad.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: new FallbackRedisStore(redisAppClient, 'rl:global:'),
  skip: (req) => {
    if (req.ip === '127.0.0.1' || req.ip === '::1') return true;
    return Boolean((req as any).apiKey);
  },
  message: { error: 'Too many requests, please try again later.' }
});

app.use(globalLimiter);

// robots.txt — desindexar la API
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
});

app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Observability: a trimmed-down 'combined' format. :safe-url logs the matched route's
// TEMPLATE ("/persons/:documentNumber"), not req.path or req.originalUrl — either of those
// would still bake a resolved path param (a real document number) or a query string (personal
// documents, search terms) straight into the logs. Falls back to req.path only for an
// unmatched (404) request. :referrer is dropped entirely: it's the caller's own Referer
// header, verbatim and unsanitized, and this API has no use for it.
morgan.token('safe-url', (req) => {
  const r = req as any;
  return r.route ? `${r.baseUrl}${r.route.path}` : r.path;
});
app.use(morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":user-agent"',
  {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  }
));

// Global Audit Middleware for API Consumption
app.use(auditMiddleware.logApiConsumption);

import { authRouter } from './modules/identity/presentation/routes';
import { procurementRouter } from './modules/procurement/presentation/routes';
import { analyticsRouter } from './modules/analytics/presentation/routes';
import { notificationsRouter } from './modules/notifications/presentation/routes';

// Mount API routes
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/procurement`, procurementRouter);
app.use(`${API_PREFIX}/analytics`, analyticsRouter);
app.use(`${API_PREFIX}/notifications`, notificationsRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  logger.info(`🚀 Contrata360 API Gateway running on port ${port}`);
});

export default app;
