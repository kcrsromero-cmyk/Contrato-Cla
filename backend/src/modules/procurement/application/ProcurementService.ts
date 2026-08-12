import { ContractProvider } from '../domain/ContractProvider';
import { Contract, FilterParams } from '../domain/types';
import { SimilarityDomainService, SimilarObjectGroup } from '../domain/SimilarityDomainService';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';

export class ProcurementService {
  private similarityService: SimilarityDomainService;
  private cacheAdapter: RedisCacheAdapter;

  constructor(
    private readonly provider: ContractProvider
  ) {
    this.similarityService = new SimilarityDomainService();
    this.cacheAdapter = new RedisCacheAdapter();
  }

  /**
   * Retrieves contracts for a specific entity and date range.
   * Leverages the configured provider (e.g. Socrata) which internalizes caching.
   */
  async getContracts(filters: FilterParams): Promise<Contract[]> {
    return this.provider.fetchContracts(filters);
  }

  /**
   * Calculates similarity groups for a given set of contracts.
   * Can be pre-computed or on-the-fly.
   */
  async calculateSimilarity(filters: FilterParams): Promise<SimilarObjectGroup[]> {
    const cacheKey = `similarity:${filters.codigoEntidad}:${filters.fechaDesde}:${filters.fechaHasta}`;
    const cached = await this.cacheAdapter.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const contracts = await this.getContracts(filters);
    const clusters = this.similarityService.calculateSimilarity(contracts);

    // Cache the result for 24 hours to offload computation
    await this.cacheAdapter.set(cacheKey, JSON.stringify(clusters), 86400);

    return clusters;
  }
}
