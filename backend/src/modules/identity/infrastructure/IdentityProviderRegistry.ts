import { IdentityProvider } from '../domain/IdentityProvider';

export class IdentityProviderRegistry {
  private static providers = new Map<string, IdentityProvider>();
  private static defaultProviderName = 'supabase';

  /**
   * Registers an identity provider with a specific name.
   */
  static register(name: string, provider: IdentityProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Resolves a provider by name. If no name is provided, returns the default provider.
   */
  static resolve(name?: string): IdentityProvider {
    const targetName = name || this.defaultProviderName;
    const provider = this.providers.get(targetName);

    if (!provider) {
      throw new Error(`Identity provider '${targetName}' is not registered.`);
    }

    return provider;
  }

}
