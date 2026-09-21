import { Request, Response } from 'express';
import { AnalyticsService } from '../application/AnalyticsService';
import { logger } from '../../../infrastructure/logger';

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getSupplierDocTypes(req: Request, res: Response) {
    try {
      const result = await this.analyticsService.getSupplierDocTypes();
      res.json(result);
    } catch (error: any) {
      logger.error('Analytics error', { error });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getPersonActivity(req: Request, res: Response) {
    try {
      const { documentNumber } = req.params;
      const result = await this.analyticsService.getPersonActivity(documentNumber);
      if (!result) {
        return res.status(404).json({ error: 'Person not found' });
      }
      res.json(result);
    } catch (error: any) {
      logger.error('Analytics error', { error });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getTopSuppliersByCount(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopSuppliersByCount()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getTopSuppliersByValue(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopSuppliersByValue()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getContractsPerDepartment(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsPerDepartment()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getContractsPerModality(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsPerModality()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getContractsPerType(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsPerType()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getSpendingPerDepartment(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getSpendingPerDepartment()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getContractsByStatus(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsByStatus()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getTopEntitiesByContractCount(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopEntitiesByContractCount()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getTopEntitiesBySpending(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopEntitiesBySpending()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }

  async getContractTrends(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractTrends()); } catch (error: any) { logger.error('Analytics error', { error }); res.status(500).json({ error: 'Internal Server Error' }); }
  }
}
