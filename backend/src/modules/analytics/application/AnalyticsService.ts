import { PrismaClient } from '@prisma/client';
import { PersonActivity } from '../domain/types';

export class AnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  // 1.
  async getSupplierDocTypes() {
    return this.prisma.person.findMany({
      select: { documentType: true },
      distinct: ['documentType'],
    });
  }

  // 2.
  async getPersonActivity(documentNumber: string): Promise<PersonActivity | null> {
    const person = await this.prisma.person.findFirst({
      where: { documentNumber },
      include: {
        contractsAsSupplier: true,
        contractsAsSupervisor: true,
        contractsAsLegalRep: true,
      }
    });

    if (!person) return null;

    const allContracts = [
      ...person.contractsAsSupplier,
      ...person.contractsAsSupervisor,
      ...person.contractsAsLegalRep,
    ];

    const uniqueContracts = Array.from(new Set(allContracts.map(c => c.id)))
      .map(id => allContracts.find(c => c.id === id)!);

    const totalValue = uniqueContracts.reduce((sum, contract) => {
      const val = contract.contractValue ? Number(contract.contractValue) : 0;
      return sum + val;
    }, 0);

    const entities = new Set(uniqueContracts.map(c => c.entityCode)).size;
    const departments = new Set(uniqueContracts.map(c => c.department).filter(Boolean)).size;

    const maskedDoc = documentNumber.length > 4
      ? '*'.repeat(documentNumber.length - 4) + documentNumber.slice(-4)
      : documentNumber;

    return {
      documentType: person.documentType,
      documentDisplay: maskedDoc,
      name: person.name,
      totalContracts: uniqueContracts.length,
      totalValue,
      entities,
      departments,
      rolesAsSupplier: person.contractsAsSupplier.length,
      rolesAsSupervisor: person.contractsAsSupervisor.length,
      rolesAsLegalRep: person.contractsAsLegalRep.length,
    };
  }

  // 3. Top 10 Suppliers by Contract Count
  async getTopSuppliersByCount() {
    const suppliers = await this.prisma.contract.groupBy({
      by: ['supplierId', 'supplierName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    return suppliers;
  }

  // 4. Top 10 Suppliers by Total Value
  async getTopSuppliersByValue() {
    const suppliers = await this.prisma.contract.groupBy({
      by: ['supplierId', 'supplierName'],
      _sum: { contractValue: true },
      orderBy: { _sum: { contractValue: 'desc' } },
      take: 10,
    });
    return suppliers;
  }

  // 5. Total contracts per department
  async getContractsPerDepartment() {
    const departments = await this.prisma.contract.groupBy({
      by: ['department'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return departments;
  }

  // 6. Contracts per modality
  async getContractsPerModality() {
    const modalities = await this.prisma.contract.groupBy({
      by: ['modality'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return modalities;
  }

  // 7. Contracts per type
  async getContractsPerType() {
    const types = await this.prisma.contract.groupBy({
      by: ['contractType'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return types;
  }

  // 8. Total spending per department
  async getSpendingPerDepartment() {
    const departments = await this.prisma.contract.groupBy({
      by: ['department'],
      _sum: { contractValue: true },
      orderBy: { _sum: { contractValue: 'desc' } },
    });
    return departments;
  }

  // 9. Contract count by status
  async getContractsByStatus() {
    const statuses = await this.prisma.contract.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return statuses;
  }

  // 10. Top entities by contract count
  async getTopEntitiesByContractCount() {
    const entities = await this.prisma.contract.groupBy({
      by: ['entityCode', 'entityName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    return entities;
  }

  // 11. Top entities by spending
  async getTopEntitiesBySpending() {
    const entities = await this.prisma.contract.groupBy({
      by: ['entityCode', 'entityName'],
      _sum: { contractValue: true },
      orderBy: { _sum: { contractValue: 'desc' } },
      take: 10,
    });
    return entities;
  }

  // 12. Contract trends by month/year (signatureDate)
  async getContractTrends() {
    // Basic aggregation grouped by year/month signature date could be done here,
    // but Prisma groupBy on dates is limited. Returning a placeholder implementation
    // that fetches counts by a specific derived field or raw query if necessary.
    // For now, returning a raw query for monthly trends as it's common.
    const trends = await this.prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', signature_date) as month,
        COUNT(id) as count,
        SUM(contract_value) as total_value
      FROM contracts
      WHERE signature_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', signature_date)
      ORDER BY month DESC
      LIMIT 12;
    `;
    return trends;
  }
}
