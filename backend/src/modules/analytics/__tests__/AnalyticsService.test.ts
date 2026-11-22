import { describe, it, expect, vi } from 'vitest';
import { AnalyticsService } from '../application/AnalyticsService';

function buildPrisma(personRow: any) {
  return {
    person: {
      findFirst: vi.fn(async () => personRow),
      findMany: vi.fn(async () => []),
    },
  } as any;
}

describe('AnalyticsService.getPersonActivity', () => {
  it('normalizes a dotted/hyphenated document before querying, so either form finds the same person', async () => {
    const personRow = {
      documentType: 'NIT',
      documentNumber: '9005409471',
      name: 'ACME S.A.S.',
      contractsAsSupplier: [{ id: 'c1', contractValue: 1000, entityCode: 'E1', department: 'Caquetá' }],
      contractsAsSupervisor: [],
      contractsAsLegalRep: [],
    };
    const prisma = buildPrisma(personRow);
    const service = new AnalyticsService(prisma);

    const result = await service.getPersonActivity('900.540.947-1');

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { documentNumber: '9005409471' } }),
    );
    expect(result?.totalContracts).toBe(1);
    expect(result?.documentDisplay).toBe('******9471');
  });

  it('returns null when no person matches the normalized document', async () => {
    const prisma = buildPrisma(null);
    const service = new AnalyticsService(prisma);

    const result = await service.getPersonActivity('does-not-exist');

    expect(result).toBeNull();
  });
});
