import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../infrastructure/db/prisma', () => ({ prisma: { featureFlag: { findUnique: vi.fn() } } }));
vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { prisma } from '../../../infrastructure/db/prisma';
import { logger } from '../../../infrastructure/logger';
import { isFeatureEnabled } from '../application/isFeatureEnabled';
import { checkFeatureEnabled, requireFeatureEnabled } from '../presentation/requireFeatureEnabled';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isFeatureEnabled', () => {
  it('returns true when no row exists for the key', async () => {
    const client = { featureFlag: { findUnique: vi.fn(async () => null) } };
    await expect(isFeatureEnabled(client as any, 'API_ACCESS')).resolves.toBe(true);
    expect(client.featureFlag.findUnique).toHaveBeenCalledWith({
      where: { key: 'API_ACCESS' },
      select: { enabled: true },
    });
  });

  it('returns true when the row has enabled: true', async () => {
    const client = { featureFlag: { findUnique: vi.fn(async () => ({ enabled: true })) } };
    await expect(isFeatureEnabled(client as any, 'API_ACCESS')).resolves.toBe(true);
  });

  it('returns false when the row has enabled: false', async () => {
    const client = { featureFlag: { findUnique: vi.fn(async () => ({ enabled: false })) } };
    await expect(isFeatureEnabled(client as any, 'API_ACCESS')).resolves.toBe(false);
  });
});

describe('requireFeatureEnabled', () => {
  const buildRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }) as any;

  it('responds 503 with FEATURE_DISABLED and does not call next when disabled', async () => {
    (prisma.featureFlag.findUnique as any).mockResolvedValue({ enabled: false });
    const res = buildRes();
    const next = vi.fn();

    await requireFeatureEnabled('ANALYTICS')({} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.',
      code: 'FEATURE_DISABLED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next once and does not respond when the row is missing', async () => {
    (prisma.featureFlag.findUnique as any).mockResolvedValue(null);
    const res = buildRes();
    const next = vi.fn();

    await requireFeatureEnabled('ANALYTICS')({} as any, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('fails open and logs a warning when the lookup throws', async () => {
    (prisma.featureFlag.findUnique as any).mockRejectedValue(new Error('db down'));
    const next = vi.fn();

    const enabled = await checkFeatureEnabled('ANALYTICS');

    expect(enabled).toBe(true);
    expect(next).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Feature flag lookup failed, treating as enabled',
      expect.objectContaining({ key: 'ANALYTICS' }),
    );
  });
});
