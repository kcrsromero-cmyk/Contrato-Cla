import { PrismaClient } from '@prisma/client';
import { ISubscriptionRepository } from '../domain/ISubscriptionRepository';
import { Subscription } from '../domain/Subscription';

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(subscription: Subscription): Promise<Subscription> {
    const created = await this.prisma.subscription.create({
      data: {
        id: subscription.id,
        organizationId: subscription.organizationId,
        planId: subscription.planId,
        limites: subscription.limites as any,
        consumo: subscription.consumo as any,
        vigencia: subscription.vigencia,
      },
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<Subscription | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
    });
    if (!sub) return null;
    return this.mapToDomain(sub);
  }

  async findByOrganizationId(organizationId: string): Promise<Subscription | null> {
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { vigencia: 'desc' }, // Get the latest one if multiple
    });
    if (!sub) return null;
    return this.mapToDomain(sub);
  }

  async update(subscription: Subscription): Promise<Subscription> {
    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: subscription.planId,
        limites: subscription.limites as any,
        consumo: subscription.consumo as any,
        vigencia: subscription.vigencia,
      },
    });
    return this.mapToDomain(updated);
  }

  private mapToDomain(dbSub: any): Subscription {
    return {
      id: dbSub.id,
      organizationId: dbSub.organizationId,
      planId: dbSub.planId,
      limites: dbSub.limites as any,
      consumo: dbSub.consumo as any,
      vigencia: dbSub.vigencia,
    };
  }
}
