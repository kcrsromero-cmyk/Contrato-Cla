import { Request, Response } from 'express';
import { ContractService } from '../application/ContractService';

export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  async getContracts(req: Request, res: Response) {
    try {
      const { codigoEntidad, fechaDesde, fechaHasta } = req.query;

      if (!codigoEntidad || !fechaDesde || !fechaHasta) {
        return res.status(400).json({
          error: 'Missing required query parameters: codigoEntidad, fechaDesde, fechaHasta'
        });
      }

      const contracts = await this.contractService.getContracts(
        codigoEntidad as string,
        fechaDesde as string,
        fechaHasta as string
      );

      res.status(200).json(contracts);
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
}
