import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import { prisma } from './infrastructure/db/prisma';
import { logger } from './infrastructure/logger';
import { AuditService } from './modules/audit/application/AuditService';
import { AuditMiddleware } from './modules/audit/presentation/AuditMiddleware';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const auditService = new AuditService(prisma);
const auditMiddleware = new AuditMiddleware(auditService);

// Middleware
app.use(helmet());
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

// Mount API routes
app.use('/api/v1/auth', authRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(port, () => {
  console.log(`🚀 Contrata360 API Gateway is running on port ${port}`);
});

export default app;
