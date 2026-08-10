import { IAIProvider } from '../domain/IAIProvider';

export class AIProviderRegistry {
  private static providers = new Map<string, IAIProvider>();
  private static defaultProviderName = 'openai';

  static register(name: string, provider: IAIProvider): void {
    this.providers.set(name, provider);
  }

  static resolve(name?: string): IAIProvider {
    const targetName = name || this.defaultProviderName;
    const provider = this.providers.get(targetName);

    if (!provider) {
      throw new Error(`AI provider '${targetName}' is not registered.`);
    }

    return provider;
  }

  static setDefault(name: string): void {
    this.defaultProviderName = name;
  }
}
