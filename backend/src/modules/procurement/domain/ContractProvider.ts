import { Contract, FilterParams } from './types';

export interface ContractProvider {
  /**
   * Fetches contracts from the external provider based on the given filters.
   */
  fetchContracts(filters: FilterParams): Promise<Contract[]>;

  /**
   * Fetches all unique departments.
   */
  getDepartments(): Promise<string[]>;

  /**
   * Fetches all unique cities for a given department.
   */
  getCities(department: string): Promise<string[]>;

  /**
   * Fetches entities based on department and city.
   */
  getEntities(department: string, city: string): Promise<any[]>;

  /**
   * Search entities globally or by NIT.
   */
  searchEntities(query: string, type: 'global' | 'advanced'): Promise<any[]>;

  /**
   * Gets available contract years for an entity.
   */
  getContractYears(entityCode: string): Promise<string[]>;
}
