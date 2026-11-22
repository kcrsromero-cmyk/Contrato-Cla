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

// Limita, por IP, cuántos intentos de autenticación de API key puede haber por minuto —
// ANTES de que identifyApiKey consulte Postgres. Sin esto, alguien puede enviar un torrente de
// tokens `ctr360_...` fabricados y el límite global (más adelante, y que de todos modos exime
// a las claves válidas) nunca alcanza a frenar la carga sobre la autenticación. Solo cuenta
// solicitudes con forma de clave de API — una sesión normal nunca pasa por aquí. El tope es
// generoso a propósito: protege contra un diluvio, no contra el tráfico legítimo de una
// oficina o NAT compartido con varias claves reales detrás.
const apiKeyAuthAttemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
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

// Observability: same as morgan's 'combined' format, but logging the path without its query
// string — the stock :url token is req.originalUrl, which can carry personal documents or
// other sensitive identifiers (e.g. ?codigoEntidad=...).
morgan.token('safe-url', (req) => (req as express.Request).path);
app.use(morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
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
