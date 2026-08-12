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

      res.json(favorites.map(f => f.contract));
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

      const { contractId, contractData } = req.body;
      if (!contractId) {
        return res.status(400).json({ error: 'contractId is required' });
      }

      // 1. Ensure contract exists in DB.
      // If we are strictly working off the provider, we might need to upsert the contract to DB here.
      if (contractData) {
         await prisma.contract.upsert({
            where: { contractId: contractId },
            update: {},
            create: {
                contractId: contractId,
                object: contractData.object || contractData.objeto_del_contrato || 'Unknown Object',
                entityName: contractData.entityName || contractData.nombre_entidad || 'Unknown Entity',
                entityCode: contractData.entityCode || contractData.codigo_entidad || '000',
                department: contractData.department,
                city: contractData.city,
                contractValue: contractData.contractValue,
            }
         });
      }

      // Map external contractId to internal UUID if necessary
      const dbContract = await prisma.contract.findUnique({
         where: { contractId: contractId }
      });

      if (!dbContract) {
         return res.status(404).json({ error: 'Contract not found in database. Must be fetched first.' });
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
