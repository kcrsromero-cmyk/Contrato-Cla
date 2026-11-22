import { describe, it, expect, vi } from 'vitest';

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

vi.mock('../../../infrastructure/redis/RedisCacheAdapter', () => ({
  RedisCacheAdapter: class {
    async get() { return null; }
    async set() {}
  },
}));

vi.mock('../../../infrastructure/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { ProcurementService } from '../application/ProcurementService';
import { ContractProvider } from '../domain/ContractProvider';

function buildProvider(contracts: any[]): ContractProvider {
  return { fetchContracts: vi.fn(async () => contracts) } as any;
}

describe('ProcurementService.getContracts', () => {
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
});
