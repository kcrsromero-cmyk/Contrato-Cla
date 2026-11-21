import { describe, it, expect, vi, beforeAll } from 'vitest';

const calls = vi.hoisted(() => ({
  capabilityUpserts: [] as any[],
  planUpserts: [] as any[],
  planUpdates: [] as any[],
  planCapabilityUpserts: [] as any[],
  featureFlagUpserts: [] as any[],
  departmentUpserts: [] as any[],
  disconnected: false,
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    capability = {
      upsert: async (args: any) => { calls.capabilityUpserts.push(args); return { id: `cap-${args.where.name}` }; },
      findUnique: async (args: any) => ({ id: `cap-${args.where.name}`, name: args.where.name }),
    };
    plan = {
      upsert: async (args: any) => { calls.planUpserts.push(args); return { id: `plan-${args.where.name}` }; },
      update: async (args: any) => { calls.planUpdates.push(args); return { id: `plan-${args.where.name}` }; },
      findUnique: async (args: any) => ({ id: `plan-${args.where.name}`, name: args.where.name }),
    };
    planCapability = { upsert: async (args: any) => { calls.planCapabilityUpserts.push(args); return args.create; } };
    featureFlag = { upsert: async (args: any) => { calls.featureFlagUpserts.push(args); return args.create; } };
    department = { upsert: async (args: any) => { calls.departmentUpserts.push(args); return { id: `dept-${args.where.name}` }; } };
    city = { upsert: async (args: any) => args.create };
    $disconnect = async () => { calls.disconnected = true; };
  },
}));

const isLinked = (plan: string, capability: string) =>
  calls.planCapabilityUpserts.some(
    (a) => a.create.planId === `plan-${plan}` && a.create.capabilityId === `cap-${capability}`,
  );

let exitSpy: any;

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  await import('../../prisma/seed');
  await vi.waitFor(() => expect(calls.disconnected).toBe(true));
});

describe('prisma/seed.ts', () => {
  it('upserts USE_ANALYTICS with update: {}', () => {
    const upsert = calls.capabilityUpserts.find((a) => a.where.name === 'USE_ANALYTICS');
    expect(upsert).toBeDefined();
    expect(upsert.update).toEqual({});
  });

  it('links USE_ANALYTICS to PROFESIONAL and ENTERPRISE only', () => {
    expect(isLinked('PROFESIONAL', 'USE_ANALYTICS')).toBe(true);
    expect(isLinked('ENTERPRISE', 'USE_ANALYTICS')).toBe(true);
    expect(isLinked('STARTER', 'USE_ANALYTICS')).toBe(false);
    expect(isLinked('FREE', 'USE_ANALYTICS')).toBe(false);
  });

  it('keeps the pre-existing capability links intact', () => {
    expect(isLinked('STARTER', 'USE_FAVORITES')).toBe(true);
    expect(isLinked('PROFESIONAL', 'USE_FAVORITES')).toBe(true);
    expect(isLinked('PROFESIONAL', 'VIEW_SIMILARITY_ANALYSIS')).toBe(true);
    expect(isLinked('ENTERPRISE', 'USE_FAVORITES')).toBe(true);
    expect(isLinked('ENTERPRISE', 'VIEW_SIMILARITY_ANALYSIS')).toBe(true);
  });

  it('upserts exactly the three default-open feature flags', () => {
    const keys = calls.featureFlagUpserts.map((a) => a.where.key).sort();
    expect(keys).toEqual(['ANALYTICS', 'API_ACCESS', 'NOTIFICATIONS']);
    for (const upsert of calls.featureFlagUpserts) {
      expect(upsert.create.enabled).toBe(true);
      expect(upsert.update).toEqual({});
    }
  });

  it('seeds territorial data, disconnects and never exits', () => {
    const names = calls.departmentUpserts.map((a) => a.where.name);
    expect(names).toContain('Amazonas');
    expect(names).toContain('Vichada');
    expect(calls.disconnected).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
