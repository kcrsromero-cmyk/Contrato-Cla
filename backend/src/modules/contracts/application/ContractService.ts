import { Contract } from '../domain/Contract';
import { IContractProvider } from '../domain/IContractProvider';

export class ContractService {
  constructor(private readonly contractProvider: IContractProvider) {}

  /**
   * Fetches the contracts for a given entity code and date range.
   * This is where caching and other business rules will be applied in the future.
   */
  async getContracts(
    codigoEntidad: string,
    fechaDesde: string,
    fechaHasta: string
  ): Promise<Contract[]> {
    if (!codigoEntidad || !fechaDesde || !fechaHasta) {
      throw new Error('codigoEntidad, fechaDesde, and fechaHasta are required');
    }

    // Call the injected provider
    return this.contractProvider.getContractsByEntity(
      codigoEntidad,
      fechaDesde,
      fechaHasta
    );
  }
}
