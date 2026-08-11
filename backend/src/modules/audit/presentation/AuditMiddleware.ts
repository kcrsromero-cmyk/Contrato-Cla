import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../application/AuditService';

export class AuditMiddleware {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Middleware to log generic API consumption
   */
  logApiConsumption = (req: Request, res: Response, next: NextFunction) => {
    // Capture the IP Address
    const ipAddress = req.ip || req.socket.remoteAddress;

    // Listen for response finish to get the status code, or log immediately.
    // Logging immediately might be better for "who consumed the API".
    // Or we log when finished to include status code. Let's log immediately.

    // We can extract userId if the AuthMiddleware ran before this.
    // We will do a simple fire-and-forget log.

    // Wait for the request to finish to log accurately
    res.on('finish', () => {
      // Try to get user id if available
      const userId = (req as any).user?.id || (req as any).tokenPayload?.sub;

      this.auditService.logAction({
        action: 'API_CONSUMPTION',
        userId: userId,
        resource: req.originalUrl,
        details: {
          method: req.method,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
        },
        ipAddress: ipAddress,
      });
    });

    next();
  };
}
