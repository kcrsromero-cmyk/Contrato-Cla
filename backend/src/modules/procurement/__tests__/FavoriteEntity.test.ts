import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { ProcurementController } from '../presentation/ProcurementController';
import { ProcurementService } from '../application/ProcurementService';
import { SocrataContractProvider } from '../infrastructure/SocrataContractProvider';

// Mock Prisma
vi.mock('../../../infrastructure/db/prisma', () => {
  return {
    prisma: {
      favoriteEntity: {
        count: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      plan: {
        findUnique: vi.fn(),
      }
    }
  }
});

import { prisma as mockPrisma } from '../../../infrastructure/db/prisma';

describe('ProcurementController - FavoriteEntities', () => {
  let procurementController: ProcurementController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    const socrataProvider = new SocrataContractProvider();
    const procurementService = new ProcurementService(socrataProvider);
    procurementController = new ProcurementController(procurementService);

    mockReq = {};
    mockRes = { send: vi.fn(),
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };

    vi.clearAllMocks();
  });

  describe('addFavoriteEntity', () => {
    it('should reject with 403 if plan is FREE', async () => {
      (mockReq as any).user = { id: 'u1', plan: 'FREE' } as any;
      mockReq.body = { entityCode: '123', entityName: 'Test' };
      (mockPrisma.plan.findUnique as any).mockResolvedValue({ name: 'FREE', maxFavoriteEntities: 0 });

      await procurementController.addFavoriteEntity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Tu plan actual no permite agregar entidades favoritas.' });
    });

    it('should reject with 403 if limit is reached for STARTER plan', async () => {
      (mockReq as any).user = { id: 'u1', plan: 'STARTER' } as any;
      mockReq.body = { entityCode: '123', entityName: 'Test' };
      (mockPrisma.plan.findUnique as any).mockResolvedValue({ name: 'STARTER', maxFavoriteEntities: 3 });
      (mockPrisma.favoriteEntity.count as any).mockResolvedValue(3);

      await procurementController.addFavoriteEntity(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Has alcanzado el límite de entidades favoritas para tu plan.' });
    });

    it('should upsert and return success if under limit', async () => {
      (mockReq as any).user = { id: 'u1', plan: 'STARTER' } as any;
      mockReq.body = { entityCode: '123', entityName: 'Test' };
      (mockPrisma.plan.findUnique as any).mockResolvedValue({ name: 'STARTER', maxFavoriteEntities: 3 });
      (mockPrisma.favoriteEntity.count as any).mockResolvedValue(2);
      (mockPrisma.favoriteEntity.upsert as any).mockResolvedValue({});

      await procurementController.addFavoriteEntity(mockReq as Request, mockRes as Response);

      expect(mockPrisma.favoriteEntity.upsert).toHaveBeenCalledWith({
        where: { userId_entityCode: { userId: 'u1', entityCode: '123' } },
        update: { entityName: 'Test' },
        create: { userId: 'u1', entityCode: '123', entityName: 'Test' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Favorite entity added/updated' });
    });

    it('should bypass limit for ENTERPRISE plan', async () => {
      (mockReq as any).user = { id: 'u1', plan: 'ENTERPRISE' } as any;
      mockReq.body = { entityCode: '123', entityName: 'Test' };
      (mockPrisma.plan.findUnique as any).mockResolvedValue({ name: 'ENTERPRISE', maxFavoriteEntities: null });
      (mockPrisma.favoriteEntity.count as any).mockResolvedValue(99);
      (mockPrisma.favoriteEntity.upsert as any).mockResolvedValue({});

      await procurementController.addFavoriteEntity(mockReq as Request, mockRes as Response);

      expect(mockPrisma.favoriteEntity.upsert).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getFavoriteEntities', () => {
    it('should return favorite entities for the user', async () => {
      (mockReq as any).user = { id: 'u1' } as any;
      (mockPrisma.favoriteEntity.findMany as any).mockResolvedValue([
        { entityCode: '123', entityName: 'Entity 1' }
      ]);

      await procurementController.getFavoriteEntities(mockReq as Request, mockRes as Response);

      expect(mockPrisma.favoriteEntity.findMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(mockRes.json).toHaveBeenCalledWith([{ entityCode: '123', entityName: 'Entity 1' }]);
    });
  });

  describe('removeFavoriteEntity', () => {
    it('should delete the favorite entity and return 204', async () => {
      (mockReq as any).user = { id: 'u1' } as any;
      mockReq.query = { entityCode: '123' };
      (mockPrisma.favoriteEntity.deleteMany as any).mockResolvedValue({});

      await procurementController.removeFavoriteEntity(mockReq as Request, mockRes as Response);

      expect(mockPrisma.favoriteEntity.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', entityCode: '123' }
      });
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('Print mockRes.json', () => {
    it('prints out the mockRes calls', async () => {
      console.log('mockRes.json.mock.calls:');

      // Caso 1: Crear favorito nuevo (under limit)
      (mockReq as any).user = { id: 'u1', plan: 'STARTER' } as any;
      mockReq.body = { entityCode: '123', entityName: 'Test' };
      (mockPrisma.plan.findUnique as any).mockResolvedValue({ name: 'STARTER', maxFavoriteEntities: 3 });
      (mockPrisma.favoriteEntity.count as any).mockResolvedValue(2);
      (mockPrisma.favoriteEntity.upsert as any).mockResolvedValue({});
      await procurementController.addFavoriteEntity(mockReq as Request, mockRes as Response);
      console.log('Crear favorito nuevo:');
      console.log(JSON.stringify((mockRes.json as any).mock.calls));

      (mockRes.json as any).mockClear();

      // Caso 2: Alcanzar límite (STARTER)
      (mockReq as any).user = { id: 'u1', plan: 'STARTER' } as any;
      mockReq.body = { entityCode: '123', entityName: 'Test' };
      (mockPrisma.plan.findUnique as any).mockResolvedValue({ name: 'STARTER', maxFavoriteEntities: 3 });
      (mockPrisma.favoriteEntity.count as any).mockResolvedValue(3);
      await procurementController.addFavoriteEntity(mockReq as Request, mockRes as Response);
      console.log('Límite alcanzado:');
      console.log(JSON.stringify((mockRes.json as any).mock.calls));

      (mockRes.json as any).mockClear();

      // Caso 3: FREE
      (mockReq as any).user = { id: 'u1', plan: 'FREE' } as any;
      mockReq.body = { entityCode: '123', entityName: 'Test' };
      (mockPrisma.plan.findUnique as any).mockResolvedValue({ name: 'FREE', maxFavoriteEntities: 0 });
      await procurementController.addFavoriteEntity(mockReq as Request, mockRes as Response);
      console.log('Plan FREE:');
      console.log(JSON.stringify((mockRes.json as any).mock.calls));
    });
  });
});
