import { Contract, FilterParams } from './types';

export interface ContractProvider {
  /**
   * Fetches contracts from the external provider based on the given filters.
   */
  fetchContracts(filters: FilterParams): Promise<Contract[]>;
}
