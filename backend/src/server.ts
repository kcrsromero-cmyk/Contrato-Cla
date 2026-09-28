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

// Rate limit global — 500 requests por IP cada 15 minutos
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: new FallbackRedisStore(redisAppClient, 'rl:global:'),
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
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

// Observability: HTTP Request Logging using Morgan and Winston Stream
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

// Global Audit Middleware for API Consumption
app.use(auditMiddleware.logApiConsumption);

import { authRouter } from './modules/identity/presentation/routes';
import { procurementRouter } from './modules/procurement/presentation/routes';
import { analyticsRouter } from './modules/analytics/presentation/routes';

// Mount API routes
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/procurement`, procurementRouter);
app.use(`${API_PREFIX}/analytics`, analyticsRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  logger.info(`🚀 Contrata360 API Gateway running on port ${port}`);
});

export default app;
