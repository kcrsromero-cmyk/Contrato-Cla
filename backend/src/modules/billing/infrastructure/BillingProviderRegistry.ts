import { BillingProvider } from '../domain/BillingProvider';

export class BillingProviderRegistry {
  private static providers = new Map<string, BillingProvider>();
  private static defaultProviderName = 'mercadopago';

  /**
   * Registers a billing provider with a specific name.
   */
  static register(name: string, provider: BillingProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Resolves a provider by name. If no name is provided, returns the default provider.
   */
  static resolve(name?: string): BillingProvider {
    const targetName = name || this.defaultProviderName;
    const provider = this.providers.get(targetName);

    if (!provider) {
      throw new Error(`Billing provider '${targetName}' is not registered.`);
    }

    return provider;
  }

  /**
   * Sets the default provider name.
   */
  static setDefault(name: string): void {
    this.defaultProviderName = name;
  }
}
