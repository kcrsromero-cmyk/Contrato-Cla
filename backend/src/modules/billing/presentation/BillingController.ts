import { Request, Response } from 'express';
import { SubscriptionService } from '../application/SubscriptionService';

export class BillingController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async subscribe(req: Request, res: Response) {
    try {
      const { planId } = req.body;
      const user = (req as any).user;

      if (!user || !user.organizationId) {
        return res.status(401).json({ error: 'User must belong to an organization to subscribe' });
      }

      if (!planId) {
        return res.status(400).json({ error: 'planId is required' });
      }

      const checkoutUrl = await this.subscriptionService.subscribe(user.organizationId, planId);

      res.status(200).json({ checkoutUrl });
    } catch (error: any) {
      console.error('Subscription error:', error);
      res.status(500).json({ error: error.message || 'Failed to initiate subscription' });
    }
  }

  async mercadopagoWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;

      // Webhooks should respond 200 OK immediately to acknowledge receipt
      res.status(200).send('OK');

      // Process asynchronously
      await this.subscriptionService.processWebhook(payload);
    } catch (error) {
      console.error('Webhook processing error:', error);
      // Even on failure, it's often best practice to return 200 to the provider if it's our logic failing,
      // but returning 500 can trigger provider retries depending on the platform's policy.
    }
  }
}
