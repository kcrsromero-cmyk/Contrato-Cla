import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './infrastructure/db/prisma';
import { logger } from './infrastructure/logger';
import { AuditService } from './modules/audit/application/AuditService';
import { AuditMiddleware } from './modules/audit/presentation/AuditMiddleware';

// Load environment variables
dotenv.config();

const app = express();

// Confiar en el proxy de Traefik (primer proxy en la cadena)
app.set('trust proxy', 1);

const port = process.env.PORT || 4000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const auditService = new AuditService(prisma);
const auditMiddleware = new AuditMiddleware(auditService);

// Seguridad de headers HTTP
app.use(helmet());

// Rate limit global — 100 requests por IP cada 15 minutos
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
  message: { error: 'Too many requests, please try again later.' }
});

// Rate limit estricto para auth — 10 intentos por 15 minutos
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

app.use(globalLimiter);
app.use('/api/v1/auth', authLimiter);

// robots.txt — desindexar la API
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
});

// Bloquear rutas de scanners ANTES de llegar a cualquier middleware
app.use((req, res, next) => {
  const path = req.path.toLowerCase()

  // Bloquear extensiones PHP inmediatamente
  if (path.endsWith('.php') || path.includes('.php.')) {
    return res.status(404).end()
  }

  // Bloquear archivos de credenciales cloud
  const credentialFiles = [
    '/.aws', '/aws.env', '/gcp', '/google-key', '/google-credentials',
    '/firebase', '/keyfile.json', '/key.json', '/sa.json',
    '/credentials.json', '/service-account', '/.config/gcloud',
    '/application_default_credentials'
  ]

  // Bloquear archivos .env de CI/CD y servicios
  const envPaths = [
    '/github/.env', '/gitlab/.env', '/jenkins/.env', '/circleci/.env',
    '/travis/.env', '/buildkite/.env', '/mysql/.env', '/redis/.env',
    '/postgres/.env', '/mongodb/.env', '/rabbitmq/.env', '/kafka/.env',
    '/elasticsearch/.env', '/production/.env', '/staging/.env',
    '/test/.env', '/dev/.env', '/qa/.env', '/beta/.env', '/uat/.env',
    '/preview/.env', '/worker/.env', '/queue/.env', '/job/.env'
  ]

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
  ]

  const isBlocked =
    credentialFiles.some(p => path.startsWith(p) || path.includes(p)) ||
    envPaths.some(p => path === p) ||
    blockedPaths.some(p => path.startsWith(p))

  if (isBlocked) {
    return res.status(404).end()
  }

  next()
})

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

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { authRouter } from './modules/identity/presentation/routes';
import { procurementRouter } from './modules/procurement/presentation/routes';
import { analyticsRouter } from './modules/analytics/presentation/routes';

// Mount API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/procurement', procurementRouter);
app.use('/api/v1/analytics', analyticsRouter);

import { setupRecurringJobs } from './infrastructure/jobs/refreshWorker';
// Initialize recurring background jobs
setupRecurringJobs().catch(console.error);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(port, () => {
  console.log(`🚀 Contrata360 API Gateway is running on port ${port}`);
});

export default app;
