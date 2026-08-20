import { Request, Response } from 'express';
import { ProcurementService } from '../application/ProcurementService';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/db/prisma';

const filterSchema = z.object({
  codigoEntidad: z.string(),
  fechaDesde: z.string(),
  fechaHasta: z.string()
});

export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  async getDepartments(req: Request, res: Response) {
    try {
      const departments = await this.procurementService.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getCities(req: Request, res: Response) {
    try {
      const { department } = req.query;
      if (!department || typeof department !== 'string') return res.status(400).json({ error: 'Missing or invalid department' });
      const cities = await this.procurementService.getCities(department);
      res.json(cities);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getEntities(req: Request, res: Response) {
    try {
      const { department, city } = req.query;
      if (!department || typeof department !== 'string' || !city || typeof city !== 'string') return res.status(400).json({ error: 'Missing or invalid parameters' });
      const entities = await this.procurementService.getEntities(department, city);
      res.json(entities);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async searchEntities(req: Request, res: Response) {
    try {
      const { q, type } = req.query;
      if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Missing query string' });
      const entities = await this.procurementService.searchEntities(q, type === 'advanced' ? 'advanced' : 'global');
      res.json(entities);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getContractYears(req: Request, res: Response) {
    try {
      const { entityCode } = req.query;
      if (!entityCode || typeof entityCode !== 'string') return res.status(400).json({ error: 'Missing entityCode' });
      const years = await this.procurementService.getContractYears(entityCode);
      res.json(years);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getContracts(req: Request, res: Response) {
    try {
      const filters = filterSchema.parse(req.query);
      const contracts = await this.procurementService.getContracts(filters);
      res.json(contracts);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.format() });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async calculateSimilarity(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const filters = filterSchema.parse(req.query);
      const hasFullAccess = user.capabilities?.includes('VIEW_SIMILARITY_ANALYSIS');

      // Siempre calculamos, pero limitamos lo que enviamos
      const allClusters = await this.procurementService.calculateSimilarity(filters);
      const totalCount = allClusters.length;

      if (!hasFullAccess && totalCount > 0) {
        const previewCount = Math.max(1, Math.round(totalCount * 0.10));
        return res.json({
          clusters: allClusters.slice(0, previewCount),
          totalCount,
          isLimited: true,
          previewCount
        });
      }

      return res.json({
        clusters: allClusters,
        totalCount,
        isLimited: false,
        previewCount: totalCount
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.format() });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getFavorites(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      if (!user.capabilities?.includes('USE_FAVORITES')) {
        return res.status(403).json({ error: 'Forbidden: Feature not available in your plan' });
      }

      const favorites = await prisma.favoriteContract.findMany({
        where: { userId: user.id },
        include: { contract: true }
      });

      res.json(favorites.map((f: any) => {
        const c = f.contract;
        return {
          id: c.id,
          contractId: c.contractId,
          reference: c.reference ?? undefined,
          status: c.status ?? undefined,
          contractType: c.contractType ?? undefined,
          modality: c.modality ?? undefined,
          justification: c.justification ?? undefined,
          object: c.object,
          deliveryConditions: c.deliveryConditions ?? undefined,
          signatureDate: c.signatureDate ?? undefined,
          startDate: c.startDate ?? undefined,
          endDate: c.endDate ?? undefined,
          contractValue: c.contractValue ?? undefined,
          advancePaymentValue: c.advancePaymentValue ?? undefined,
          invoicedValue: c.invoicedValue ?? undefined,
          paidValue: c.paidValue ?? undefined,
          pendingPaymentValue: c.pendingPaymentValue ?? undefined,
          pendingExecutionValue: c.pendingExecutionValue ?? undefined,
          duration: c.duration ?? undefined,
          location: c.location ?? undefined,
          centralizedEntity: c.centralizedEntity ?? undefined,
          order: c.order ?? undefined,
          sector: c.sector ?? undefined,
          branch: c.branch ?? undefined,
          supervisorName: c.supervisorName ?? undefined,
          spenderName: c.spenderName ?? undefined,
          department: c.department ?? undefined,
          city: c.city ?? undefined,
          entityName: c.entityName,
          entityCode: c.entityCode,
          entityNit: c.entityNit ?? undefined,
          urlproceso: c.urlproceso ?? undefined,
          supplierName: c.supplierName ?? undefined,
          procurementProcessId: c.procurementProcessId ?? undefined,
        };
      }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async addFavorite(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check capabilities (implemented in Auth / CurrentUserResolver context)
      if (!user.capabilities?.includes('USE_FAVORITES')) {
        return res.status(403).json({ error: 'Forbidden: Feature not available in your plan' });
      }

      const { contractId } = req.body;
      if (!contractId) {
        return res.status(400).json({ error: 'contractId is required' });
      }

      // Ensure contract exists in DB.
      const dbContract = await prisma.contract.findUnique({
         where: { contractId: contractId }
      });

      if (!dbContract) {
         return res.status(404).json({ error: 'Contract not found in database. Must be fetched by the system first.' });
      }

      await prisma.favoriteContract.create({
        data: {
          userId: user.id,
          contractId: dbContract.id
        }
      });

      res.status(201).json({ message: 'Favorite added' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async addFavoriteEntity(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const planName = user.plan || 'FREE';
      const { entityCode, entityName } = req.body;
      if (!entityCode || !entityName) {
        return res.status(400).json({ error: 'entityCode and entityName are required' });
      }

      const userPlan = await prisma.plan.findUnique({ where: { name: planName } });
      const limit = userPlan?.maxFavoriteEntities;

      if (limit !== undefined && limit !== null) {
        if (limit === 0) {
          return res.status(403).json({ error: 'Tu plan actual no permite agregar entidades favoritas.' });
        }
        const count = await prisma.favoriteEntity.count({ where: { userId: user.id } });
        if (count >= limit) {
          return res.status(403).json({ error: 'Has alcanzado el límite de entidades favoritas para tu plan.' });
        }
      }

      await prisma.favoriteEntity.upsert({
        where: { userId_entityCode: { userId: user.id, entityCode } },
        update: { entityName },
        create: { userId: user.id, entityCode, entityName }
      });

      res.status(201).json({ message: 'Favorite entity added/updated' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getFavoriteEntities(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const entities = await prisma.favoriteEntity.findMany({
        where: { userId: user.id },
      });

      res.json(entities);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async removeFavoriteEntity(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { entityCode } = req.query;
      if (!entityCode || typeof entityCode !== 'string') {
        return res.status(400).json({ error: 'entityCode is required' });
      }

      await prisma.favoriteEntity.deleteMany({
        where: { userId: user.id, entityCode }
      });

      res.status(204).send();
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async removeFavoriteContract(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { contractId } = req.query;
      if (!contractId || typeof contractId !== 'string') {
        return res.status(400).json({ error: 'contractId is required' });
      }

      const dbContract = await prisma.contract.findUnique({
        where: { contractId }
      });
      if (!dbContract) return res.status(404).json({ error: 'Contract not found' });

      await prisma.favoriteContract.deleteMany({
        where: { userId: user.id, contractId: dbContract.id }
      });

      res.status(204).send();
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
