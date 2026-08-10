import { IAIProvider, AIAnalysisResult } from '../domain/IAIProvider';
import { IAIRequestRepository } from '../domain/IAIRequestRepository';
import { randomUUID } from 'crypto';

export class AIService {
  constructor(
    private readonly provider: IAIProvider,
    private readonly aiRequestRepository: IAIRequestRepository
  ) {}

  /**
   * Analyzes a contract using the injected AI provider, logs the usage,
   * and returns the analysis.
   */
  async analyzeContract(contractData: any, userId: string, organizationId: string): Promise<AIAnalysisResult> {

    // In a real scenario, you would first check SubscriptionService here to ensure
    // the organization has enough quota for an AI request before proceeding.

    // 1. Perform the analysis via the provider
    const result = await this.provider.analyzeContract(contractData);

    // 2. Log the request for auditing and billing purposes
    await this.aiRequestRepository.create({
      id: randomUUID(),
      proveedor: result.provider,
      modelo: result.model,
      tokens: result.tokensUsed,
      costo: result.estimatedCost,
      usuario: userId,
      organizacion: organizationId,
    });

    return result;
  }
}
