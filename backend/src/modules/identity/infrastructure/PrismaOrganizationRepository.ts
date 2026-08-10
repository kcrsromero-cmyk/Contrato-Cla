import { PrismaClient } from '@prisma/client';
import { IOrganizationRepository, Organization } from '../domain/IOrganizationRepository';

export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!org) return null;

    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
    };
  }

  async create(organization: Omit<Organization, 'createdAt'>): Promise<Organization> {
    const createdOrg = await this.prisma.organization.create({
      data: {
        id: organization.id,
        name: organization.name,
      },
    });

    return {
      id: createdOrg.id,
      name: createdOrg.name,
      createdAt: createdOrg.createdAt,
    };
  }

  async update(organization: Organization): Promise<Organization> {
    const updatedOrg = await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: organization.name,
      },
    });

    return {
      id: updatedOrg.id,
      name: updatedOrg.name,
      createdAt: updatedOrg.createdAt,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({
      where: { id },
    });
  }
}
