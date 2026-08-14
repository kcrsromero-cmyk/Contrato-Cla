import { ContractProvider } from '../domain/ContractProvider';
import { Contract, FilterParams } from '../domain/types';
import { SimilarityDomainService, SimilarObjectGroup } from '../domain/SimilarityDomainService';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';
import { prisma } from '../../../infrastructure/db/prisma';
import { logger } from '../../../infrastructure/logger';

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
    const { codigoEntidad, fechaDesde, fechaHasta } = filters;
    const cacheKey = `contracts:${codigoEntidad}:${fechaDesde}:${fechaHasta}`;

    // 1. Check Redis Cache
    const cachedData = await this.cacheAdapter.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData).map((c: any) => ({
        ...c,
        signatureDate: c.signatureDate ? new Date(c.signatureDate) : undefined,
        startDate: c.startDate ? new Date(c.startDate) : undefined,
        endDate: c.endDate ? new Date(c.endDate) : undefined,
        lastUpdate: c.lastUpdate ? new Date(c.lastUpdate) : undefined,
      }));
    }

    // 2. Check Postgres Cache
    const dbContracts = await prisma.contract.findMany({
      where: {
        entityCode: codigoEntidad,
        signatureDate: {
          gte: new Date(`${fechaDesde}T00:00:00.000Z`),
          lte: new Date(`${fechaHasta}T23:59:59.999Z`)
        }
      }
    });

    if (dbContracts.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(`${fechaHasta}T23:59:59.999Z`);

      let isFresh = true;
      if (endDate >= today) {
        // Range includes today or future, check if all records are synced within last 24h
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        isFresh = dbContracts.every(c => c.syncedAt && c.syncedAt >= twentyFourHoursAgo);
      }

      if (isFresh) {
        const domainData: Contract[] = dbContracts.map(c => ({
          id: c.id,
          contractId: c.contractId,
          reference: c.reference ?? undefined,
          status: c.status ?? undefined,
          contractType: c.contractType ?? undefined,
          modality: c.modality ?? undefined,
          justification: c.justification ?? undefined,
          object: c.object,
          deliveryConditions: c.deliveryConditions ?? undefined,
          signatureDate: c.signatureDate ?? undefined,
          startDate: c.startDate ?? undefined,
          endDate: c.endDate ?? undefined,
          lastUpdate: c.lastUpdate ?? undefined,
          contractValue: c.contractValue ?? undefined,
          advancePaymentValue: c.advancePaymentValue ?? undefined,
          invoicedValue: c.invoicedValue ?? undefined,
          paidValue: c.paidValue ?? undefined,
          pendingPaymentValue: c.pendingPaymentValue ?? undefined,
          pendingExecutionValue: c.pendingExecutionValue ?? undefined,
          cdpBalance: c.cdpBalance ?? undefined,
          duration: c.duration ?? undefined,
          addedDays: c.addedDays ?? undefined,
          isExtendable: c.isExtendable ?? undefined,
          location: c.location ?? undefined,
          centralizedEntity: c.centralizedEntity ?? undefined,
          order: c.order ?? undefined,
          sector: c.sector ?? undefined,
          branch: c.branch ?? undefined,
          supervisorName: c.supervisorName ?? undefined,
          spenderName: c.spenderName ?? undefined,
          department: c.department ?? undefined,
          city: c.city ?? undefined,
          entityName: c.entityName,
          entityCode: c.entityCode,
          entityNit: c.entityNit ?? undefined,
          supplierName: undefined, // Prisma uses supplierId to relation Supplier, but Domain Contract expects supplierName
          procurementProcessId: c.procurementProcessId ?? undefined,
        }));
        await this.cacheAdapter.set(cacheKey, JSON.stringify(domainData), 86400);
        return domainData;
      }
    }

    // 3. Fetch from Provider (Socrata)
    logger.info(`Fetching from Socrata provider for cache key: ${cacheKey}`);
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
          syncedAt: new Date(),
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
          syncedAt: new Date(),
        }
      });
    }

    await this.cacheAdapter.set(cacheKey, JSON.stringify(contracts), 86400);

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
