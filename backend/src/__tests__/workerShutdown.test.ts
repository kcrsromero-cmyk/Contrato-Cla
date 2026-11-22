import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const gatewayState = vi.hoisted(() => ({ constructCalls: 0, startCalls: 0 }));

vi.mock('../infrastructure/config/env', () => ({
  config: { TELEGRAM_BOT_TOKEN: 'TEST_TOKEN' },
}));

vi.mock('../modules/notifications/infrastructure/TelegramLinkGateway', () => ({
  TelegramLinkGateway: class {
    constructor() {
      gatewayState.constructCalls += 1;
    }
    start = vi.fn(() => {
      gatewayState.startCalls += 1;
    });
    stop = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('../infrastructure/jobs/refreshWorker', () => ({
  datasetImportWorker: { close: vi.fn().mockResolvedValue(undefined) },
  datasetNormalizationWorker: { close: vi.fn().mockResolvedValue(undefined) },
  departmentsWorker: { close: vi.fn().mockResolvedValue(undefined) },
  citiesWorker: { close: vi.fn().mockResolvedValue(undefined) },
  entitiesWorker: { close: vi.fn().mockResolvedValue(undefined) },
  auditLogCleanupWorker: { close: vi.fn().mockResolvedValue(undefined) },
  datasetImportQueue: { close: vi.fn().mockResolvedValue(undefined) },
  datasetNormalizationQueue: { close: vi.fn().mockResolvedValue(undefined) },
  departmentsQueue: { close: vi.fn().mockResolvedValue(undefined) },
  citiesQueue: { close: vi.fn().mockResolvedValue(undefined) },
  entitiesQueue: { close: vi.fn().mockResolvedValue(undefined) },
  auditLogCleanupQueue: { close: vi.fn().mockResolvedValue(undefined) },
  setupRecurringJobs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../infrastructure/redis/redisWorkerClient', () => ({
  redisWorkerClient: {
    quit: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('../infrastructure/db/prisma', () => ({
  prisma: {
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));

import { gracefulShutdown, telegramLinkGateway } from '../worker';
import {
  datasetImportWorker,
  datasetNormalizationWorker,
  departmentsWorker,
  citiesWorker,
  entitiesWorker,
  auditLogCleanupWorker,
  datasetImportQueue,
  datasetNormalizationQueue,
  departmentsQueue,
  citiesQueue,
  entitiesQueue,
  auditLogCleanupQueue
} from '../infrastructure/jobs/refreshWorker';
import { redisWorkerClient } from '../infrastructure/redis/redisWorkerClient';
import { prisma } from '../infrastructure/db/prisma';

describe('Worker Graceful Shutdown', () => {
  let processExitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      return undefined as never;
    });
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  it('should gracefully close workers, queues, redis, prisma and exit with 0', async () => {
    await gracefulShutdown('SIGTERM');

    expect(datasetImportWorker.close).toHaveBeenCalled();
    expect(datasetNormalizationWorker.close).toHaveBeenCalled();
    expect(departmentsWorker.close).toHaveBeenCalled();
    expect(citiesWorker.close).toHaveBeenCalled();
    expect(entitiesWorker.close).toHaveBeenCalled();
    expect(auditLogCleanupWorker.close).toHaveBeenCalled();

    expect(datasetImportQueue.close).toHaveBeenCalled();
    expect(datasetNormalizationQueue.close).toHaveBeenCalled();
    expect(departmentsQueue.close).toHaveBeenCalled();
    expect(citiesQueue.close).toHaveBeenCalled();
    expect(entitiesQueue.close).toHaveBeenCalled();
    expect(auditLogCleanupQueue.close).toHaveBeenCalled();

    expect(redisWorkerClient.quit).toHaveBeenCalled();
    expect(prisma.$disconnect).toHaveBeenCalled();

    expect(telegramLinkGateway.stop).toHaveBeenCalled();
    expect(
      vi.mocked(telegramLinkGateway.stop).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(prisma.$disconnect).mock.invocationCallOrder[0]);

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('constructs one TelegramLinkGateway and starts it exactly once', () => {
    expect(gatewayState.constructCalls).toBe(1);
    expect(gatewayState.startCalls).toBe(1);
  });
});
