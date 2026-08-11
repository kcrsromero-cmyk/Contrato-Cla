import { PrismaClient } from '@prisma/client';
import { logger } from '../../../infrastructure/logger';

export interface AuditLogData {
  action: string;
  userId?: string;
  resource?: string;
  details?: any;
  ipAddress?: string;
}

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async logAction(data: AuditLogData): Promise<void> {
    try {
      // 1. Persist to Relational Database (Immutable Record)
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          userId: data.userId,
          resource: data.resource,
          details: data.details,
          ipAddress: data.ipAddress,
        },
      });

      // 2. Log to Observability / Metrics System
      logger.info(`[AUDIT] ${data.action}`, {
        userId: data.userId,
        resource: data.resource,
        ipAddress: data.ipAddress,
        // don't log heavy details to stdout if not necessary, but kept for context
      });
    } catch (error) {
      // We don't want audit logging failure to crash the main transaction, but we must log it
      logger.error('Failed to write audit log to database', { error, data });
    }
  }
}
