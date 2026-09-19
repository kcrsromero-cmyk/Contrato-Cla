import dotenv from 'dotenv';
dotenv.config();

import { setupRecurringJobs } from './infrastructure/jobs/refreshWorker';
import { logger } from './infrastructure/logger';

logger.info('Starting BullMQ worker process');
setupRecurringJobs().catch((err) => {
  logger.error('Failed to setup recurring jobs', { error: err.message });
  process.exit(1);
});
