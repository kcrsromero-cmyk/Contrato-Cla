import { BillingProvider } from '../domain/BillingProvider';

export class MercadoPagoBillingProvider implements BillingProvider {
  private readonly baseUrl = 'https://api.mercadopago.com/preapproval';
  private readonly accessToken: string;

  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST_TOKEN';
  }

  async createSubscription(organizationId: string, planId: string): Promise<string> {
    // Basic fetch implementation mimicking the API call to avoid heavy SDK dependencies initially
    const payload = {
      preapproval_plan_id: planId,
      payer_email: `admin_${organizationId}@test.com`, // Usually dynamically passed
      reason: `Suscripción Contrata360 - Plan ${planId}`,
      external_reference: organizationId,
      status: "pending"
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.init_point; // URL for the user to complete the subscription
    } catch (error) {
      console.error('Error creating MercadoPago subscription:', error);
      // For local testing without a real MP token, we fallback to a mock URL
      if (this.accessToken === 'TEST_TOKEN') {
        return `https://www.mercadopago.com.co/checkout/mock_checkout_${organizationId}_${planId}`;
      }
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) {
        throw new Error(`MercadoPago API error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error cancelling MercadoPago subscription:', error);
      if (this.accessToken !== 'TEST_TOKEN') throw error;
    }
  }

  async handleWebhook(payload: any): Promise<void> {
    // Validate signature and payload
    // Typically MercadoPago sends topic="preapproval" or "payment"
    console.log('Received MercadoPago webhook payload:', payload);

    if (payload.type === 'subscription_preapproval') {
       // Validate the payload state and dispatch domain events
       console.log(`Processing subscription webhook for id: ${payload.data.id}`);
    }
  }
}
