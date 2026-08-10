import { PrismaClient } from '@prisma/client';
import { IUserRepository } from '../domain/IUserRepository';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { Role } from '../domain/types';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      organizationId: user.organizationId || undefined,
      roles: user.roles as Role[],
      permissions: [],
    };
  }

  async create(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    const createdUser = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        roles: user.roles,
      },
    });

    return {
      ...user,
      id: createdUser.id,
    };
  }

  async update(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        roles: user.roles,
      },
    });

    return {
      ...user,
      id: updatedUser.id,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}
