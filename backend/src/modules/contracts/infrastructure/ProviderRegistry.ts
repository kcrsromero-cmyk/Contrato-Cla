import { IContractProvider } from '../domain/IContractProvider';

export class ContractProviderRegistry {
  private static providers = new Map<string, IContractProvider>();
  private static defaultProviderName = 'socrata';

  /**
   * Registers a data provider with a specific name.
   */
  static register(name: string, provider: IContractProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Resolves a provider by name. If no name is provided, returns the default provider.
   */
  static resolve(name?: string): IContractProvider {
    const targetName = name || this.defaultProviderName;
    const provider = this.providers.get(targetName);

    if (!provider) {
      throw new Error(`Contract provider '${targetName}' is not registered.`);
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
