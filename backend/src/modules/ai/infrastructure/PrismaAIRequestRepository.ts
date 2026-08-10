import { PrismaClient } from '@prisma/client';
import { IAIRequestRepository } from '../domain/IAIRequestRepository';
import { AIRequest } from '../domain/AIRequest';

export class PrismaAIRequestRepository implements IAIRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(request: AIRequest): Promise<AIRequest> {
    const created = await this.prisma.aIRequest.create({
      data: {
        id: request.id,
        proveedor: request.proveedor,
        modelo: request.modelo,
        tokens: request.tokens,
        costo: request.costo,
        userId: request.usuario,
        organizationId: request.organizacion,
      },
    });

    return {
      id: created.id,
      proveedor: created.proveedor,
      modelo: created.modelo,
      tokens: created.tokens,
      costo: created.costo,
      usuario: created.userId,
      organizacion: created.organizationId,
    };
  }

  async findByOrganization(organizationId: string): Promise<AIRequest[]> {
    const requests = await this.prisma.aIRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map(req => ({
      id: req.id,
      proveedor: req.proveedor,
      modelo: req.modelo,
      tokens: req.tokens,
      costo: req.costo,
      usuario: req.userId,
      organizacion: req.organizationId,
    }));
  }
}
