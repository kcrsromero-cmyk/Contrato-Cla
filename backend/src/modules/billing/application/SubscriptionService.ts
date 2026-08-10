import { BillingProvider } from '../domain/BillingProvider';
import { ISubscriptionRepository } from '../domain/ISubscriptionRepository';

export class SubscriptionService {
  constructor(
    private readonly billingProvider: BillingProvider,
    private readonly subscriptionRepository: ISubscriptionRepository
  ) {}

  /**
   * Initializes a subscription process for an organization.
   * Returns the checkout URL provided by the billing provider (e.g. MercadoPago init_point)
   */
  async subscribe(organizationId: string, planId: string): Promise<string> {
    if (!organizationId || !planId) {
      throw new Error('organizationId and planId are required to subscribe.');
    }

    // Call the external provider to generate the checkout session
    const checkoutUrl = await this.billingProvider.createSubscription(organizationId, planId);

    return checkoutUrl;
  }

  /**
   * Processes an incoming webhook from the billing provider.
   * This handles updates to the local subscription records based on payment events.
   */
  async processWebhook(payload: any): Promise<void> {
    // Pass the raw payload to the provider to validate and decipher
    await this.billingProvider.handleWebhook(payload);

    // In a real application, the handleWebhook method or a domain event would return the
    // structured data needed to update the local subscription state via this.subscriptionRepository
  }
}
