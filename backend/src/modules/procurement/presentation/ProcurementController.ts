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
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

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

      if (!user.capabilities?.includes('VIEW_SIMILARITY_ANALYSIS')) {
        return res.status(403).json({ error: 'Forbidden: Feature not available in your plan' });
      }

      const filters = filterSchema.parse(req.query);
      const clusters = await this.procurementService.calculateSimilarity(filters);
      res.json(clusters);
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

      res.json(favorites.map((f: any) => f.contract));
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
}
