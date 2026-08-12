import { Request, Response } from 'express';
import { IdentityService } from '../application/IdentityService';

import { AuditService } from '../../audit/application/AuditService';

export class AuthController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly auditService: AuditService
  ) {}

  async register(req: Request, res: Response) {
    try {
      const result = await this.identityService.register(req.body);

      await this.auditService.logAction({
        action: 'REGISTER_SUCCESS',
        userId: result.user.id,
        resource: 'identity/register',
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.status(201).json(result);
    } catch (error: any) {
      // Avoid logging plain text passwords
      const safeBody = { ...req.body };
      delete safeBody.password;

      await this.auditService.logAction({
        action: 'REGISTER_FAILED',
        details: { error: error.message, body: safeBody },
        resource: 'identity/register',
        ipAddress: req.ip || req.socket.remoteAddress,
      });
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await this.identityService.login(req.body);

      await this.auditService.logAction({
        action: 'LOGIN_SUCCESS',
        userId: result.user.id,
        resource: 'identity/login',
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.status(200).json(result);
    } catch (error: any) {
      await this.auditService.logAction({
        action: 'LOGIN_FAILED',
        details: { error: error.message, email: req.body.email },
        resource: 'identity/login',
        ipAddress: req.ip || req.socket.remoteAddress,
      });
      res.status(401).json({ error: error.message });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await this.identityService.logout(token);
      }
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }
      const result = await this.identityService.refresh(refreshToken);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      // In a real scenario, this is often set by the middleware
      const user = (req as any).user;
      if (user) {
        return res.status(200).json(user);
      }

      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const currentUser = await this.identityService.getCurrentUser(token);
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json(currentUser);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
}
