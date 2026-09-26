import { ContractProvider } from '../domain/ContractProvider';
import { Contract, FilterParams } from '../domain/types';
import { SimilarityDomainService, SimilarObjectGroup } from '../domain/SimilarityDomainService';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';
import { prisma } from '../../../infrastructure/db/prisma';
import { logger } from '../../../infrastructure/logger';
import { normalizeDocumentType, maskDocument } from '../../../utils/documentNormalizer';

const TTL_TERRITORIAL = 60 * 60 * 24 * 7; // 7 days - departments, cities, entities
const TTL_CONTRACTS = 60 * 60 * 24;       // 24 hours - contracts and similarity
const TTL_YEARS = 60 * 60 * 12;           // 12 hours - años con contratos por entidad

/**
 * Convierte un contrato del proveedor en el DTO público: elimina los números de documento
 * en claro (proveedor, supervisor, representante legal) y expone solo la versión enmascarada.
 */
export function toPublicContract(contract: Contract): Contract {
  const {
    supplierDocument,
    supervisorDocument,
    legalRepDocument,
    legalRepDocumentType,
    ...rest
  } = contract;

  return {
    ...rest,
    supplierDocumentDisplay: supplierDocument?.trim()
      ? maskDocument(supplierDocument.trim(), normalizeDocumentType(contract.supplierDocumentType))
      : rest.supplierDocumentDisplay,
    supervisorDocumentDisplay: supervisorDocument?.trim()
      ? maskDocument(supervisorDocument.trim(), normalizeDocumentType(contract.supervisorDocumentType))
      : rest.supervisorDocumentDisplay,
  };
}

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
    const cacheKey = 'departments';
    const cachedData = await this.cacheAdapter.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Check Postgres
    const dbDepartments = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });

    if (dbDepartments.length > 0) {
      const names = dbDepartments.map(d => d.name);
      await this.cacheAdapter.set(cacheKey, JSON.stringify(names), TTL_TERRITORIAL);
      return names;
    }

    // Fetch from Socrata
    const departments = await this.provider.getDepartments();

    for (const name of departments) {
      await prisma.department.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }

    await this.cacheAdapter.set(cacheKey, JSON.stringify(departments), TTL_TERRITORIAL);
    return departments;
  }

  async getCities(department: string): Promise<string[]> {
    const cacheKey = `cities:${department}`;
    const cachedData = await this.cacheAdapter.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Check Postgres
    const dbCities = await prisma.city.findMany({
      where: { department: { name: department } },
      orderBy: { name: 'asc' }
    });

    if (dbCities.length > 0) {
      const names = dbCities.map(c => c.name);
      await this.cacheAdapter.set(cacheKey, JSON.stringify(names), TTL_TERRITORIAL);
      return names;
    }

    // Fetch from Socrata
    const cities = await this.provider.getCities(department);

    const dbDept = await prisma.department.findUnique({ where: { name: department } });
    if (dbDept) {
      for (const name of cities) {
        await prisma.city.upsert({
          where: { departmentId_name: { departmentId: dbDept.id, name } },
          update: {},
          create: { name, departmentId: dbDept.id }
        });
      }
    }

    await this.cacheAdapter.set(cacheKey, JSON.stringify(cities), TTL_TERRITORIAL);
    return cities;
  }

  async getEntities(department: string, city: string): Promise<any[]> {
    const cacheKey = `entities:${department}:${city}`;
    const cachedData = await this.cacheAdapter.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Check Postgres
    const dbEntities = await prisma.entity.findMany({
      where: { city: { name: city, department: { name: department } } },
      orderBy: { name: 'asc' }
    });

    if (dbEntities.length > 0) {
      const entities = dbEntities.map(e => ({
        codigo_entidad: e.entityCode,
        nombre_entidad: e.name,
        nit_entidad: e.nit,
        orden: e.order
      }));
      await this.cacheAdapter.set(cacheKey, JSON.stringify(entities), TTL_TERRITORIAL);
      return entities;
    }

    // Fetch from Socrata
    const entities = await this.provider.getEntities(department, city);

    const dbCity = await prisma.city.findFirst({
      where: { name: city, department: { name: department } }
    });

    if (dbCity) {
      for (const entity of entities) {
        await prisma.entity.upsert({
          where: { entityCode: entity.codigo_entidad },
          update: {
            name: entity.nombre_entidad,
            nit: entity.nit_entidad,
            order: entity.orden,
            syncedAt: new Date()
          },
          create: {
            entityCode: entity.codigo_entidad,
            name: entity.nombre_entidad,
            nit: entity.nit_entidad,
            order: entity.orden,
            cityId: dbCity.id,
            syncedAt: new Date()
          }
        });
      }
    }

    await this.cacheAdapter.set(cacheKey, JSON.stringify(entities), TTL_TERRITORIAL);
    return entities;
  }
async searchEntities(query: string, type: 'global' | 'advanced'): Promise<any[]> {
    return this.provider.searchEntities(query, type);
  }

  async getContractYears(entityCode: string): Promise<string[]> {
    const cacheKey = `years:${entityCode}`;
    const cached = await this.cacheAdapter.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const years = await this.provider.getContractYears(entityCode);
    await this.cacheAdapter.set(cacheKey, JSON.stringify(years), TTL_YEARS);
    return years;
  }

  async getContracts(filters: FilterParams): Promise<Contract[]> {
    const { codigoEntidad, fechaDesde, fechaHasta } = filters;
    // v2: las entradas antiguas (sin versión) podían contener documentos sin enmascarar.
    const cacheKey = `contracts:v2:${codigoEntidad}:${fechaDesde}:${fechaHasta}`;

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
      },
      include: {
        procurementProcess: true,
        supplier: true,
        supervisor: true,
        legalRep: true
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
          object: c.object ?? undefined,
          deliveryConditions: c.deliveryConditions ?? undefined,
          signatureDate: c.signatureDate ?? undefined,
          startDate: c.startDate ?? undefined,
          endDate: c.endDate ?? undefined,
          lastUpdate: c.lastUpdate ?? undefined,
          contractValue: c.contractValue ? c.contractValue.toNumber() : undefined,
          advancePaymentValue: c.advancePaymentValue ? c.advancePaymentValue.toNumber() : undefined,
          invoicedValue: c.invoicedValue ? c.invoicedValue.toNumber() : undefined,
          paidValue: c.paidValue ? c.paidValue.toNumber() : undefined,
          pendingPaymentValue: c.pendingPaymentValue ? c.pendingPaymentValue.toNumber() : undefined,
          pendingExecutionValue: c.pendingExecutionValue ? c.pendingExecutionValue.toNumber() : undefined,
          cdpBalance: c.cdpBalance ? c.cdpBalance.toNumber() : undefined,
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
          entityName: c.entityName ?? undefined,
          entityCode: c.entityCode,
          entityNit: c.entityNit ?? undefined,
          urlproceso: c.procurementProcess?.url ?? undefined,
          supplierName: c.supplierName ?? undefined, // Prisma uses supplierId to relation Supplier, but Domain Contract expects supplierName
          procurementProcessId: c.procurementProcessId ?? undefined,
          supplierDocumentType: c.supplier?.documentType ?? undefined,
          supplierDocumentDisplay: c.supplier
            ? maskDocument(c.supplier.documentNumber, c.supplier.documentType as any)
            : undefined,
          supervisorDocumentDisplay: c.supervisor
            ? maskDocument(c.supervisor.documentNumber, c.supervisor.documentType as any)
            : undefined,
        }));
        await this.cacheAdapter.set(cacheKey, JSON.stringify(domainData), TTL_CONTRACTS);
        return domainData;
      }
    }

    // 3. Fetch from Provider (Socrata)
    logger.info(`Fetching from Socrata provider for cache key: ${cacheKey}`);
    const contracts = await this.provider.fetchContracts(filters);

    // Persist contracts to Postgres
    for (const contractData of contracts) {
      // Contratos sin entityCode son inválidos en SECOP II — descartar
      if (!contractData.entityCode?.trim()) {
        logger.warn('Skipping contract with missing entityCode', {
          contractId: contractData.contractId,
        });
        continue;
      }

      let procurementProcessUUID: string | undefined;

      if (contractData.procurementProcessId) {
        const proc = await prisma.procurementProcess.upsert({
          where: { processId: contractData.procurementProcessId },
          update: { url: contractData.urlproceso ?? undefined },
          create: {
            processId: contractData.procurementProcessId,
            url: contractData.urlproceso ?? undefined,
          }
        });
        procurementProcessUUID = proc.id;
      }

      const [supplierPerson, supervisorPerson, legalRepPerson] = await Promise.all([
        contractData.supplierDocument && contractData.supplierDocumentType
          ? prisma.person.upsert({
              where: { documentType_documentNumber: { documentType: normalizeDocumentType(contractData.supplierDocumentType), documentNumber: contractData.supplierDocument.trim() } },
              update: { name: contractData.supplierName ?? undefined },
              create: { documentType: normalizeDocumentType(contractData.supplierDocumentType), documentNumber: contractData.supplierDocument.trim(), name: contractData.supplierName ?? undefined }
            })
          : Promise.resolve(null),

        contractData.supervisorDocument && contractData.supervisorDocumentType
          ? prisma.person.upsert({
              where: { documentType_documentNumber: { documentType: normalizeDocumentType(contractData.supervisorDocumentType), documentNumber: contractData.supervisorDocument.trim() } },
              update: { name: contractData.supervisorName ?? undefined },
              create: { documentType: normalizeDocumentType(contractData.supervisorDocumentType), documentNumber: contractData.supervisorDocument.trim(), name: contractData.supervisorName ?? undefined }
            })
          : Promise.resolve(null),

        contractData.legalRepDocument && contractData.legalRepDocumentType
          ? prisma.person.upsert({
              where: { documentType_documentNumber: { documentType: normalizeDocumentType(contractData.legalRepDocumentType), documentNumber: contractData.legalRepDocument.trim() } },
              update: { name: contractData.legalRepName ?? undefined },
              create: { documentType: normalizeDocumentType(contractData.legalRepDocumentType), documentNumber: contractData.legalRepDocument.trim(), name: contractData.legalRepName ?? undefined }
            })
          : Promise.resolve(null),
      ]);

      const supplierUUID = supplierPerson?.id;
      const supervisorUUID = supervisorPerson?.id;
      const legalRepUUID = legalRepPerson?.id;

      await prisma.contract.upsert({
        where: { contractId: contractData.contractId },
        update: {
          status: contractData.status,
          paidValue: contractData.paidValue,
          pendingPaymentValue: contractData.pendingPaymentValue,
          pendingExecutionValue: contractData.pendingExecutionValue,
          supplierName: contractData.supplierName,
          supplierId: supplierUUID,
          supervisorId: supervisorUUID,
          legalRepId: legalRepUUID,
          syncedAt: new Date(),
        },
        create: {
          contractId: contractData.contractId,
          reference: contractData.reference,
          status: contractData.status,
          contractType: contractData.contractType,
          modality: contractData.modality,
          justification: contractData.justification,
          object: contractData.object ?? null,
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
          entityName: contractData.entityName ?? null,
          entityCode: contractData.entityCode,
          entityNit: contractData.entityNit,
          procurementProcessId: procurementProcessUUID,

          supplierName: contractData.supplierName,
          supplierId: supplierUUID,
          supervisorId: supervisorUUID,
          legalRepId: legalRepUUID,
          syncedAt: new Date(),
        }
      });
    }

    // Nunca devolver ni cachear números de documento en claro (Ley 1581 / habeas data).
    const publicContracts = contracts.map(toPublicContract);
    await this.cacheAdapter.set(cacheKey, JSON.stringify(publicContracts), TTL_CONTRACTS);

    return publicContracts;
  }

  /**
   * Calculates similarity groups for a given set of contracts.
   * Can be pre-computed or on-the-fly.
   */
  async calculateSimilarity(filters: FilterParams): Promise<SimilarObjectGroup[]> {
    const cacheKey = `similarity:v2:${filters.codigoEntidad}:${filters.fechaDesde}:${filters.fechaHasta}`;
    const cached = await this.cacheAdapter.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const contracts = await this.getContracts(filters);
    const clusters = this.similarityService.calculateSimilarity(contracts);

    // Cache the result for 24 hours to offload computation
    await this.cacheAdapter.set(cacheKey, JSON.stringify(clusters), TTL_CONTRACTS);

    return clusters;
  }
}
