import { ContractProvider } from '../domain/ContractProvider';
import { Contract, FilterParams } from '../domain/types';
import { SimilarityDomainService, SimilarObjectGroup } from '../domain/SimilarityDomainService';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';
import { prisma } from '../../../infrastructure/db/prisma';

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
   * Persists fetched contracts into the PostgreSQL database.
   */
  async getDepartments(): Promise<string[]> {
    return this.provider.getDepartments();
  }

  async getCities(department: string): Promise<string[]> {
    return this.provider.getCities(department);
  }

  async getEntities(department: string, city: string): Promise<any[]> {
    return this.provider.getEntities(department, city);
  }

  async searchEntities(query: string, type: 'global' | 'advanced'): Promise<any[]> {
    return this.provider.searchEntities(query, type);
  }

  async getContractYears(entityCode: string): Promise<string[]> {
    return this.provider.getContractYears(entityCode);
  }

  async getContracts(filters: FilterParams): Promise<Contract[]> {
    const contracts = await this.provider.fetchContracts(filters);

    // Persist contracts to Postgres
    for (const contractData of contracts) {
      await prisma.contract.upsert({
        where: { contractId: contractData.contractId },
        update: {
          status: contractData.status,
          paidValue: contractData.paidValue,
          pendingPaymentValue: contractData.pendingPaymentValue,
          pendingExecutionValue: contractData.pendingExecutionValue,
        },
        create: {
          contractId: contractData.contractId,
          reference: contractData.reference,
          status: contractData.status,
          contractType: contractData.contractType,
          modality: contractData.modality,
          justification: contractData.justification,
          object: contractData.object || 'Unknown Object',
          deliveryConditions: contractData.deliveryConditions,

          signatureDate: contractData.signatureDate,
          startDate: contractData.startDate,
          endDate: contractData.endDate,
          lastUpdate: contractData.lastUpdate,

          contractValue: contractData.contractValue,
          advancePaymentValue: contractData.advancePaymentValue,
          invoicedValue: contractData.invoicedValue,
          paidValue: contractData.paidValue,
          pendingPaymentValue: contractData.pendingPaymentValue,
          pendingExecutionValue: contractData.pendingExecutionValue,
          cdpBalance: contractData.cdpBalance,

          duration: contractData.duration,
          addedDays: contractData.addedDays,
          isExtendable: contractData.isExtendable,

          location: contractData.location,
          centralizedEntity: contractData.centralizedEntity,
          order: contractData.order,
          sector: contractData.sector,
          branch: contractData.branch,

          supervisorName: contractData.supervisorName,
          spenderName: contractData.spenderName,

          department: contractData.department,
          city: contractData.city,
          entityName: contractData.entityName || 'Unknown Entity',
          entityCode: contractData.entityCode || '000',
          entityNit: contractData.entityNit,
        }
      });
    }

    return contracts;
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
