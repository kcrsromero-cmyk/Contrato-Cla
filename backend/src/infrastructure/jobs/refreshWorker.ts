import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../logger';
// Import the domain event or service once implemented
// import { DatasetImportedEvent, DatasetNormalizationCompletedEvent } from '...';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

// Define Queues
export const datasetImportQueue = new Queue('dataset-import', { connection });
export const datasetNormalizationQueue = new Queue('dataset-normalization', { connection });

// Initialize Worker for importing
export const datasetImportWorker = new Worker('dataset-import', async (job: Job) => {
  logger.info(`Processing job ${job.id} for dataset import`);
  try {
    // In a real application, call the Application Service to fetch new data via SocrataContractProvider
    // Example: await procurementService.importNewContracts();

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info(`Completed dataset import job ${job.id}`);

    // Trigger the next step in the pipeline (normalization / similarity calculation)
    await datasetNormalizationQueue.add('normalize', { sourceJobId: job.id });

  } catch (error) {
    logger.error(`Failed job ${job.id} dataset import`, { error });
    throw error;
  }
}, { connection });

datasetImportWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed with error ${err.message}`);
});

// Initialize Worker for normalization/similarity
export const datasetNormalizationWorker = new Worker('dataset-normalization', async (job: Job) => {
  logger.info(`Processing job ${job.id} for dataset normalization`);
  try {
    // Here we could call SimilarityDomainService to precompute and cache similarities for popular entities
    // Example: await procurementService.precomputeSimilarities();

    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.info(`Completed dataset normalization job ${job.id}`);

  } catch (error) {
    logger.error(`Failed job ${job.id} dataset normalization`, { error });
    throw error;
  }
}, { connection });


// Setup Cron to run every 24 hours
export const setupRecurringJobs = async () => {
  logger.info('Setting up recurring dataset import jobs (every 24h)');
  // BullMQ v5+ recurring job syntax
  await datasetImportQueue.upsertJobScheduler(
    'daily-import',
    {
      pattern: '0 0 * * *' // Every day at midnight
    },
    {
      name: 'daily-import',
      data: {}
    }
  );
};
