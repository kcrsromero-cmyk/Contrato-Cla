import { Request, Response } from 'express';
import { IdentityService } from '../application/IdentityService';
import { prisma } from '../../../infrastructure/db/prisma';
import { AuditService } from '../../audit/application/AuditService';

export class AuthController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly auditService: AuditService
  ) {}

  async register(req: Request, res: Response) {
    const genericMessage = { message: 'Si los datos son válidos, revisa tu correo para continuar.' };

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

      // Check for user already exists error from Supabase
      const isAlreadyExistsError = error.code === 'user_already_exists' ||
                                   (error.message && error.message.toLowerCase().includes('already registered'));

      if (isAlreadyExistsError) {
        await this.auditService.logAction({
          action: 'REGISTER_FAILED_ENUMERATION_ATTEMPT',
          details: { error: error.message, body: safeBody },
          resource: 'identity/register',
          ipAddress: req.ip || req.socket.remoteAddress,
        });

        // Return identical response to a successful registration
        return res.status(201).json(genericMessage);
      }

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

  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { name, phone, telegramUsername, notifyEmail, notifyTelegram, notifySms, planName } = req.body;

      // Solo actualizar campos que vienen en el body
      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone.trim() || null;
      if (telegramUsername !== undefined) {
        // Normalizar: remover @ si el usuario lo incluye
        updateData.telegramUsername = telegramUsername.trim().replace(/^@/, '') || null;
      }
      if (notifyEmail !== undefined) updateData.notifyEmail = Boolean(notifyEmail);
      if (notifyTelegram !== undefined) updateData.notifyTelegram = Boolean(notifyTelegram);
      if (notifySms !== undefined) updateData.notifySms = Boolean(notifySms);

      if (planName !== undefined) {
        const targetPlan = await prisma.plan.findUnique({ where: { name: planName } });
        if (targetPlan) {
          updateData.planId = targetPlan.id;
          if (planName === 'FREE') {
            updateData.planExpiresAt = null;
          } else {
            // Al asignar plan pagado — vence en 30 días en UTC
            updateData.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          telegramUsername: true,
          notifyEmail: true,
          notifyTelegram: true,
          notifySms: true,
          planId: true,
          planExpiresAt: true,
          plan: {
            select: {
              name: true,
              maxFavoriteEntities: true,
              capabilities: { select: { capability: { select: { name: true } } } }
            }
          }
        }
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
