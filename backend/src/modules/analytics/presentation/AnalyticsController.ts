import { Request, Response } from 'express';
import { AnalyticsService } from '../application/AnalyticsService';

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getSupplierDocTypes(req: Request, res: Response) {
    try {
      const result = await this.analyticsService.getSupplierDocTypes();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
      res.status(500).json({ error: error.message });
    }
  }

  async getTopSuppliersByCount(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopSuppliersByCount()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getTopSuppliersByValue(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopSuppliersByValue()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getContractsPerDepartment(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsPerDepartment()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getContractsPerModality(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsPerModality()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getContractsPerType(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsPerType()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getSpendingPerDepartment(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getSpendingPerDepartment()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getContractsByStatus(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractsByStatus()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getTopEntitiesByContractCount(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopEntitiesByContractCount()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getTopEntitiesBySpending(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getTopEntitiesBySpending()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }

  async getContractTrends(req: Request, res: Response) {
    try { res.json(await this.analyticsService.getContractTrends()); } catch (error: any) { res.status(500).json({ error: error.message }); }
  }
}
