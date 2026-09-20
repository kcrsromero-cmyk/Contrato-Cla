import { prisma } from '../db/prisma';
import { Worker, Queue, Job } from 'bullmq';
import { logger } from '../logger';
import { redisWorkerClient } from '../redis/redisWorkerClient';
import { ProcurementService } from '../../modules/procurement/application/ProcurementService';
import { SocrataContractProvider } from '../../modules/procurement/infrastructure/SocrataContractProvider';

const connection = redisWorkerClient;

// Define Queues
export const datasetImportQueue = new Queue('dataset-import', { connection });
export const datasetNormalizationQueue = new Queue('dataset-normalization', { connection });

// Initialize Worker for importing
export const datasetImportWorker = new Worker('dataset-import', async (job: Job) => {
  logger.info(`Processing job ${job.id} for dataset import`);
  try {
    const socrataProvider = new SocrataContractProvider();
    const procurementService = new ProcurementService(socrataProvider);

    const currentDate = new Date();
    const yearStart = `${currentDate.getFullYear()}-01-01`;
    const yearEnd = `${currentDate.getFullYear()}-12-31`;

    if (job.data?.codigoEntidad) {
      await procurementService.getContracts({
        codigoEntidad: job.data.codigoEntidad,
        fechaDesde: yearStart,
        fechaHasta: yearEnd
      });
      await datasetNormalizationQueue.add('normalize', {
        sourceJobId: job.id,
        codigoEntidad: job.data.codigoEntidad,
        fechaDesde: yearStart,
        fechaHasta: yearEnd
      });
    } else {
      const entities = await prisma.entity.findMany({ select: { entityCode: true } });
      for (const entity of entities) {
        try {
          await procurementService.getContracts({
            codigoEntidad: entity.entityCode,
            fechaDesde: yearStart,
            fechaHasta: yearEnd
          });
          await datasetNormalizationQueue.add('normalize', {
            sourceJobId: job.id,
            codigoEntidad: entity.entityCode,
            fechaDesde: yearStart,
            fechaHasta: yearEnd
          });
        } catch (e) {
          logger.error(`Failed importing entity ${entity.entityCode}`, { error: e });
        }
      }
    }

    logger.info(`Completed dataset import job ${job.id}`);

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




// ─── Territorial sync — 3 queues independientes en cascada ───────────────────

export const departmentsQueue = new Queue('territorial-departments', { connection });
export const citiesQueue      = new Queue('territorial-cities',      { connection });
export const entitiesQueue    = new Queue('territorial-entities',    { connection });

// Worker 1: Departamentos → persiste en Postgres → dispara ciudades
export const departmentsWorker = new Worker('territorial-departments', async (job: Job) => {
  logger.info('Syncing departments from Socrata');
  const socrataProvider = new SocrataContractProvider();
  const departments = await socrataProvider.getDepartments();

  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  logger.info(`Departments synced: ${departments.length} — triggering cities sync`);
  await citiesQueue.add('sync-cities', {}, { priority: 2 });
}, { connection });

departmentsWorker.on('failed', (job, err) => {
  logger.error(`Departments job ${job?.id} failed: ${err.message}`);
});

// Worker 2: Ciudades → persiste en Postgres → dispara entidades
export const citiesWorker = new Worker('territorial-cities', async (job: Job) => {
  logger.info('Syncing cities from Socrata');
  const socrataProvider = new SocrataContractProvider();
  const departments = await prisma.department.findMany();

  for (const dept of departments) {
    const cities = await socrataProvider.getCities(dept.name);
    for (const cityName of cities) {
      await prisma.city.upsert({
        where: { departmentId_name: { departmentId: dept.id, name: cityName } },
        update: {},
        create: { name: cityName, departmentId: dept.id }
      });
    }
  }

  logger.info('Cities synced — triggering entities sync');
  await entitiesQueue.add('sync-entities', {}, { priority: 3 });
}, { connection });

citiesWorker.on('failed', (job, err) => {
  logger.error(`Cities job ${job?.id} failed: ${err.message}`);
});

// Worker 3: Entidades → persiste en Postgres — sin cachear aquí, el caché se llena por demanda
export const entitiesWorker = new Worker('territorial-entities', async (job: Job) => {
  logger.info('Syncing entities from Socrata');
  const socrataProvider = new SocrataContractProvider();
  const cities = await prisma.city.findMany({ include: { department: true } });

  for (const city of cities) {
    const entities = await socrataProvider.getEntities(city.department.name, city.name);
    for (const entity of entities) {
      await prisma.entity.upsert({
        where: { entityCode: entity.codigo_entidad },
        update: {
          name: entity.nombre_entidad,
          nit: entity.nit_entidad,
          order: entity.orden,
          syncedAt: new Date()
        },
        create: {
          entityCode: entity.codigo_entidad,
          name: entity.nombre_entidad,
          nit: entity.nit_entidad,
          order: entity.orden,
          cityId: city.id,
          syncedAt: new Date()
        }
      });
    }
  }

  logger.info('Entities synced');
}, { connection });

entitiesWorker.on('failed', (job, err) => {
  logger.error(`Entities job ${job?.id} failed: ${err.message}`);
});

// ─── Crons y warmup ──────────────────────────────────────────────────────────

export const setupRecurringJobs = async () => {
  logger.info('Setting up recurring dataset import jobs (every 24h)');

  // Dataset import — sin cambios
  await datasetImportQueue.upsertJobScheduler(
    'daily-import',
    { pattern: '0 0 * * *' },
    { name: 'daily-import', data: {} }
  );

  // Departamentos y ciudades: primer día de cada mes (casi nunca cambian)
  await departmentsQueue.upsertJobScheduler(
    'monthly-departments',
    { pattern: '0 0 1 * *' },
    { name: 'monthly-departments', data: {} }
  );

  // Entidades: todos los domingos (pueden aparecer nuevas alcaldías o entidades)
  await entitiesQueue.upsertJobScheduler(
    'weekly-entities',
    { pattern: '0 0 * * 0' },
    { name: 'weekly-entities', data: {} }
  );

  // Warmup: si las tablas están vacías al arrancar, disparar cascada completa
  const departmentCount = await prisma.department.count();
  if (departmentCount === 0) {
    logger.info('Territorial tables empty — triggering cascade sync in background');
    await departmentsQueue.add('initial-warmup', {}, { priority: 1 });
  }
};
