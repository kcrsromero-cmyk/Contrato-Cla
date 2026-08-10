import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { authRouter } from './modules/identity/presentation/routes';
import { contractRouter } from './modules/contracts/presentation/routes';
import { billingRouter } from './modules/billing/presentation/routes';

// Mount API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/contracts', contractRouter);
app.use('/api/v1/billing', billingRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(port, () => {
  console.log(`🚀 Contrata360 API Gateway is running on port ${port}`);
});

export default app;
