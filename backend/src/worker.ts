import './infrastructure/config/env';

import {
  setupRecurringJobs,
  datasetImportWorker,
  datasetNormalizationWorker,
  departmentsWorker,
  citiesWorker,
  entitiesWorker,
  datasetImportQueue,
  datasetNormalizationQueue,
  departmentsQueue,
  citiesQueue,
  entitiesQueue
} from './infrastructure/jobs/refreshWorker';
import { redisWorkerClient } from './infrastructure/redis/redisWorkerClient';
import { prisma } from './infrastructure/db/prisma';
import { logger } from './infrastructure/logger';

let isShuttingDown = false;

export const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress, ignoring duplicate signal: ${signal}`);
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown of BullMQ worker process...`);

  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30 seconds. Forcing process exit.');
    process.exit(1);
  }, 30000);

  // Prevent timeout timer from keeping process alive if everything closes earlier
  if (timeout.unref) {
    timeout.unref();
  }

  try {
    logger.info('Closing BullMQ workers...');
    await Promise.all([
      datasetImportWorker.close(),
      datasetNormalizationWorker.close(),
      departmentsWorker.close(),
      citiesWorker.close(),
      entitiesWorker.close(),
    ]);
    logger.info('BullMQ workers closed.');

    logger.info('Closing BullMQ queues...');
    await Promise.all([
      datasetImportQueue.close(),
      datasetNormalizationQueue.close(),
      departmentsQueue.close(),
      citiesQueue.close(),
      entitiesQueue.close(),
    ]);
    logger.info('BullMQ queues closed.');

    logger.info('Disconnecting redisWorkerClient...');
    await redisWorkerClient.quit();
    logger.info('redisWorkerClient disconnected.');

    logger.info('Disconnecting Prisma client...');
    await prisma.$disconnect();
    logger.info('Prisma client disconnected.');

    clearTimeout(timeout);
    logger.info('Graceful shutdown completed successfully. Exiting process.');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during graceful shutdown', { error: error?.message || error });
    clearTimeout(timeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

logger.info('Starting BullMQ worker process');
setupRecurringJobs().catch((err) => {
  logger.error('Failed to setup recurring jobs', { error: err.message });
  process.exit(1);
});
