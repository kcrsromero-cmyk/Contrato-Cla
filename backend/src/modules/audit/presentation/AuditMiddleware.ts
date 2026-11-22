import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../application/AuditService';

export class AuditMiddleware {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Middleware to log generic API consumption
   */
  logApiConsumption = (req: Request, res: Response, next: NextFunction) => {
    const path = (req.originalUrl || req.path || '').toLowerCase();
    if (path.includes('/health')) {
      return next();
    }

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

      // By 'finish' time routing already happened, so req.route is the matched layer and its
      // .path is the route TEMPLATE ("/persons/:documentNumber"), never the resolved value —
      // req.path alone would bake a real document number (or other identifier) from a path
      // param straight into audit_logs. Falls back to req.path only for an unmatched route
      // (404), which by definition isn't any business route's identifier pattern.
      const resource = (req as any).route
        ? `${req.baseUrl}${(req as any).route.path}`
        : req.path;

      this.auditService.logAction({
        action: 'API_CONSUMPTION',
        userId: userId,
        resource,
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
