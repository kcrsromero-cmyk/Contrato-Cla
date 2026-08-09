import { Contract } from './Contract';

/**
 * Provider-Agnostic Interface for fetching contract data.
 */
export interface IContractProvider {
  /**
   * Fetch contracts for a given entity code and date range.
   */
  getContractsByEntity(
    codigoEntidad: string,
    fechaDesde: string,
    fechaHasta: string
  ): Promise<Contract[]>;
}
