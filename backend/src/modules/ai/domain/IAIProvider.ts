export interface AIAnalysisResult {
  analysis: string;
  tokensUsed: number;
  estimatedCost: number;
  model: string;
  provider: string;
}

export interface IAIProvider {
  /**
   * Analyzes the risk or summarizes a given contract object/text.
   */
  analyzeContract(contractData: string | Record<string, any>): Promise<AIAnalysisResult>;
}
