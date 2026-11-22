import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    contract: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async () => ({})),
    },
    procurementProcess: { upsert: vi.fn(async () => ({ id: 'proc-1' })) },
    person: { upsert: vi.fn(async () => ({ id: 'person-1' })) },
  },
}));

const redisState = vi.hoisted(() => ({ cached: null as string | null, lastSetKey: '' }));

vi.mock('../../../infrastructure/redis/RedisCacheAdapter', () => ({
  RedisCacheAdapter: class {
    async get() { return redisState.cached; }
    async set(key: string) { redisState.lastSetKey = key; }
  },
}));

vi.mock('../../../infrastructure/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { ProcurementService } from '../application/ProcurementService';
import { ContractProvider } from '../domain/ContractProvider';

function buildProvider(contracts: any[]): ContractProvider {
  return { fetchContracts: vi.fn(async () => contracts) } as any;
}

describe('ProcurementService.getContracts', () => {
  beforeEach(() => {
    redisState.cached = null;
    redisState.lastSetKey = '';
  });

  it('writes the Redis cache key under the versioned contracts:v2: prefix', async () => {
    const service = new ProcurementService(buildProvider([
      { id: 'c1', contractId: 'CO-1', entityCode: 'E1' },
    ]));

    await service.getContracts({ codigoEntidad: 'E1', fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' });

    expect(redisState.lastSetKey).toBe('contracts:v2:E1:2026-01-01:2026-01-31');
  });

  it('re-sanitizes a contract read back from Redis, in case an old unmasked entry is ever hit', async () => {
    redisState.cached = JSON.stringify([
      {
        id: 'c1',
        contractId: 'CO-1',
        entityCode: 'E1',
        supplierDocument: '123456789',
        supplierDocumentType: 'Cédula de Ciudadanía',
      },
    ]);
    const service = new ProcurementService(buildProvider([]));

    const [result] = await service.getContracts({ codigoEntidad: 'E1', fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' });

    expect(result).not.toHaveProperty('supplierDocument');
    expect(result.supplierDocumentDisplay).toBe('12345****');
  });

  it('leaves an already-public cached contract untouched (idempotent re-sanitization)', async () => {
    redisState.cached = JSON.stringify([
      { id: 'c1', contractId: 'CO-1', entityCode: 'E1', supplierDocumentDisplay: '12345****' },
    ]);
    const service = new ProcurementService(buildProvider([]));

    const [result] = await service.getContracts({ codigoEntidad: 'E1', fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' });

    expect(result.supplierDocumentDisplay).toBe('12345****');
  });

  it('strips raw personal documents and masks them before caching/returning a freshly-fetched contract', async () => {
    const rawContract = {
      id: 'c1',
      contractId: 'CO-1',
      entityCode: 'E1',
      supplierDocument: '123456789',
      supplierDocumentType: 'Cédula de Ciudadanía',
      supervisorDocument: '987654321',
      supervisorDocumentType: 'Cédula de Ciudadanía',
      legalRepDocument: '555555555',
      legalRepDocumentType: 'Cédula de Ciudadanía',
    };
    const service = new ProcurementService(buildProvider([rawContract]));

    const [result] = await service.getContracts({
      codigoEntidad: 'E1',
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-01-31',
    });

    expect(result).not.toHaveProperty('supplierDocument');
    expect(result).not.toHaveProperty('supervisorDocument');
    expect(result).not.toHaveProperty('legalRepDocument');
    expect(result.supplierDocumentDisplay).toBe('12345****');
    expect(result.supervisorDocumentDisplay).toBe('98765****');
  });

  it('persists the person with the document stripped of dots/hyphens, so formatting alone never splits one contractist into two rows', async () => {
    const { prisma } = await import('../../../infrastructure/db/prisma');
    const rawContract = {
      id: 'c1',
      contractId: 'CO-1',
      entityCode: 'E1',
      supplierDocument: '900.540.947-1',
      supplierDocumentType: 'NIT',
    };
    const service = new ProcurementService(buildProvider([rawContract]));

    await service.getContracts({ codigoEntidad: 'E1', fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' });

    expect(prisma.person.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentType_documentNumber: { documentType: 'NIT', documentNumber: '9005409471' } },
      }),
    );
  });
});
