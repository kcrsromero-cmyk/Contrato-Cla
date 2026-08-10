export interface BillingProvider {
  /**
   * Initializes a subscription process with the external payment gateway.
   * Returns a checkout URL or session ID.
   */
  createSubscription(organizationId: string, planId: string): Promise<string>;

  /**
   * Cancels an active subscription in the external payment gateway.
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Parses and validates a webhook payload from the payment gateway.
   */
  handleWebhook(payload: any): Promise<void>;
}
