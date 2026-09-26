import { Request, Response } from 'express';
import { ProcurementService } from '../application/ProcurementService';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/db/prisma';
import { logger } from '../../../infrastructure/logger';

// Listas blancas validadas contra los valores reales del dataset SECOP II (datos.gov.co).
const entityCodeSchema = z.string().trim().regex(/^[A-Za-z0-9._-]{1,50}$/, 'Invalid entity code');
const territorySchema = z.string().trim().regex(/^[\p{L}\p{M}\p{N} .,()'\/-]{1,120}$/u, 'Invalid territory name');
const contractIdSchema = z.string().trim().regex(/^[A-Za-z0-9._-]{1,100}$/, 'Invalid contract id');

const filterSchema = z.object({
  codigoEntidad: entityCodeSchema,
  fechaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fechaDesde must be YYYY-MM-DD'),
  fechaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fechaHasta must be YYYY-MM-DD'),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  type: z.string().optional(),
});

const favoriteEntitySchema = z.object({
  entityCode: entityCodeSchema,
  entityName: z.string().trim().min(1).max(300),
});

const invalidParams = (res: Response, error: z.ZodError) =>
  res.status(400).json({ error: 'Invalid parameters', details: error.flatten().fieldErrors });

const isUniqueViolation = (error: any) => error?.code === 'P2002';

const SIMILARITY_PREVIEW_PERCENTAGE = 0.10;

export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  async getDepartments(req: Request, res: Response) {
    try {
      const departments = await this.procurementService.getDepartments();
      res.json(departments);
    } catch (error) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getCities(req: Request, res: Response) {
    try {
      const department = territorySchema.safeParse(req.query.department);
      if (!department.success) return res.status(400).json({ error: 'Missing or invalid department' });
      const cities = await this.procurementService.getCities(department.data);
      res.json(cities);
    } catch (error) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getEntities(req: Request, res: Response) {
    try {
      const department = territorySchema.safeParse(req.query.department);
      const city = territorySchema.safeParse(req.query.city);
      if (!department.success || !city.success) return res.status(400).json({ error: 'Missing or invalid parameters' });
      const entities = await this.procurementService.getEntities(department.data, city.data);
      res.json(entities);
    } catch (error) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async searchEntities(req: Request, res: Response) {
    try {
      const parsed = searchSchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ error: 'Missing query string' });
      const { q, type } = parsed.data;
      const entities = await this.procurementService.searchEntities(q, type === 'advanced' ? 'advanced' : 'global');
      res.json(entities);
    } catch (error) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getContractYears(req: Request, res: Response) {
    try {
      const entityCode = entityCodeSchema.safeParse(req.query.entityCode);
      if (!entityCode.success) return res.status(400).json({ error: 'Missing entityCode' });
      const years = await this.procurementService.getContractYears(entityCode.data);
      res.json(years);
    } catch (error) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
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
        return invalidParams(res, error);
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
        const previewCount = Math.max(1, Math.round(totalCount * SIMILARITY_PREVIEW_PERCENTAGE));
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
        return invalidParams(res, error);
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
        include: { contract: { include: { procurementProcess: true } } }
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
          urlproceso: c.procurementProcess?.url ?? undefined,
          supplierName: c.supplierName ?? undefined,
          procurementProcessId: c.procurementProcessId ?? undefined,
        };
      }));
    } catch (error) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
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

      const contractId = contractIdSchema.safeParse(req.body?.contractId);
      if (!contractId.success) {
        return res.status(400).json({ error: 'contractId is required' });
      }

      // Ensure contract exists in DB.
      const dbContract = await prisma.contract.findUnique({
         where: { contractId: contractId.data }
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
      if (isUniqueViolation(error)) {
        return res.status(409).json({ error: 'Favorite already exists' });
      }
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async addFavoriteEntity(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const planName = user.plan || 'FREE';
      const parsed = favoriteEntitySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'entityCode and entityName are required' });
      }
      const { entityCode, entityName } = parsed.data;

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
      logger.error('Procurement controller error', { message: (error as any)?.message });
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
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async removeFavoriteEntity(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const entityCode = entityCodeSchema.safeParse(req.query.entityCode);
      if (!entityCode.success) {
        return res.status(400).json({ error: 'entityCode is required' });
      }

      await prisma.favoriteEntity.deleteMany({
        where: { userId: user.id, entityCode: entityCode.data }
      });

      res.status(204).send();
    } catch (error: any) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async removeFavoriteContract(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const contractId = contractIdSchema.safeParse(req.query.contractId);
      if (!contractId.success) {
        return res.status(400).json({ error: 'contractId is required' });
      }

      const dbContract = await prisma.contract.findUnique({
        where: { contractId: contractId.data }
      });
      if (!dbContract) return res.status(404).json({ error: 'Contract not found' });

      await prisma.favoriteContract.deleteMany({
        where: { userId: user.id, contractId: dbContract.id }
      });

      res.status(204).send();
    } catch (error: any) {
      logger.error('Procurement controller error', { message: (error as any)?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
