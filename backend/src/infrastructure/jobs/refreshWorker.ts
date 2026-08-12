import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../logger';
import { ProcurementService } from '../../modules/procurement/application/ProcurementService';
import { SocrataContractProvider } from '../../modules/procurement/infrastructure/SocrataContractProvider';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

// Define Queues
export const datasetImportQueue = new Queue('dataset-import', { connection });
export const datasetNormalizationQueue = new Queue('dataset-normalization', { connection });

// Initialize Worker for importing
export const datasetImportWorker = new Worker('dataset-import', async (job: Job) => {
  logger.info(`Processing job ${job.id} for dataset import`);
  try {
    const socrataProvider = new SocrataContractProvider();
    const procurementService = new ProcurementService(socrataProvider);

    // As a default or placeholder, we could fetch data for a well-known entity or use job data
    const codigoEntidad = job.data?.codigoEntidad || '704283084'; // Example entity if none provided
    const currentDate = new Date();
    const yearStart = `${currentDate.getFullYear()}-01-01`;
    const yearEnd = `${currentDate.getFullYear()}-12-31`;

    await procurementService.getContracts({
      codigoEntidad: codigoEntidad,
      fechaDesde: yearStart,
      fechaHasta: yearEnd
    });

    logger.info(`Completed dataset import job ${job.id}`);

    // Trigger the next step in the pipeline (normalization / similarity calculation)
    await datasetNormalizationQueue.add('normalize', { sourceJobId: job.id, codigoEntidad, fechaDesde: yearStart, fechaHasta: yearEnd });

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
    const socrataProvider = new SocrataContractProvider();
    const procurementService = new ProcurementService(socrataProvider);

    if (job.data?.codigoEntidad && job.data?.fechaDesde && job.data?.fechaHasta) {
       await procurementService.calculateSimilarity({
          codigoEntidad: job.data.codigoEntidad,
          fechaDesde: job.data.fechaDesde,
          fechaHasta: job.data.fechaHasta
       });
    }

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
