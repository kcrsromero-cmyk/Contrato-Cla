import { describe, it, expect, vi } from 'vitest';
import { ProcurementController } from '../presentation/ProcurementController';

function buildRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis() } as any;
}

function buildReq(query: Record<string, string>) {
  return { query } as any;
}

const BASE = { codigoEntidad: 'E1' };

describe('ProcurementController.getContracts — filterSchema', () => {
  it('accepts a valid, ordered, within-range date pair', async () => {
    const service = { getContracts: vi.fn(async () => []) } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(buildReq({ ...BASE, fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(service.getContracts).toHaveBeenCalled();
  });

  it('rejects a calendar date that does not exist', async () => {
    const service = { getContracts: vi.fn() } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(buildReq({ ...BASE, fechaDesde: '2026-02-30', fechaHasta: '2026-03-01' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.getContracts).not.toHaveBeenCalled();
  });

  it('rejects fechaDesde after fechaHasta', async () => {
    const service = { getContracts: vi.fn() } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(buildReq({ ...BASE, fechaDesde: '2026-02-01', fechaHasta: '2026-01-01' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.getContracts).not.toHaveBeenCalled();
  });

  it('rejects a range longer than 366 days', async () => {
    const service = { getContracts: vi.fn() } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(buildReq({ ...BASE, fechaDesde: '2024-01-01', fechaHasta: '2026-01-01' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.getContracts).not.toHaveBeenCalled();
  });

  it('accepts a range exactly at the 366-day ceiling (spanning a leap year)', async () => {
    const service = { getContracts: vi.fn(async () => []) } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(buildReq({ ...BASE, fechaDesde: '2024-01-01', fechaHasta: '2025-01-01' }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(service.getContracts).toHaveBeenCalled();
  });
});

describe('ProcurementController.getContracts — pagination', () => {
  const ALL = Array.from({ length: 25 }, (_, i) => ({ id: `c${i}` }));

  it('returns the full array, with no X-Total-Count header, when limit is not sent (unchanged default)', async () => {
    const service = { getContracts: vi.fn(async () => ALL) } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(buildReq({ ...BASE, fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' }), res);

    expect(res.set).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(ALL);
  });

  it('slices the result and sets X-Total-Count when limit is sent', async () => {
    const service = { getContracts: vi.fn(async () => ALL) } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(
      buildReq({ ...BASE, fechaDesde: '2026-01-01', fechaHasta: '2026-01-31', limit: '10' }),
      res,
    );

    expect(res.set).toHaveBeenCalledWith('X-Total-Count', '25');
    expect(res.json).toHaveBeenCalledWith(ALL.slice(0, 10));
  });

  it('honors offset together with limit', async () => {
    const service = { getContracts: vi.fn(async () => ALL) } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(
      buildReq({ ...BASE, fechaDesde: '2026-01-01', fechaHasta: '2026-01-31', limit: '10', offset: '20' }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(ALL.slice(20, 30));
  });

  it('rejects a limit above the page-size ceiling', async () => {
    const service = { getContracts: vi.fn() } as any;
    const controller = new ProcurementController(service);
    const res = buildRes();

    await controller.getContracts(
      buildReq({ ...BASE, fechaDesde: '2026-01-01', fechaHasta: '2026-01-31', limit: '501' }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.getContracts).not.toHaveBeenCalled();
  });
});
