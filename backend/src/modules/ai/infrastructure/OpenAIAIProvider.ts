import { IAIProvider, AIAnalysisResult } from '../domain/IAIProvider';

export class OpenAIAIProvider implements IAIProvider {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly model = 'gpt-4o-mini';
  private readonly costPer1kTokens = 0.00015; // Example rough estimate

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || 'TEST_KEY';
  }

  async analyzeContract(contractData: string | Record<string, any>): Promise<AIAnalysisResult> {
    const textData = typeof contractData === 'string' ? contractData : JSON.stringify(contractData);

    if (this.apiKey === 'TEST_KEY') {
       // Mock response for testing/development without a real API key
       return {
         analysis: "This is a mock analysis for the provided contract data. No severe risks detected.",
         tokensUsed: 150,
         estimatedCost: 150 * (this.costPer1kTokens / 1000),
         model: this.model,
         provider: 'openai'
       };
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert Colombian public contracting analyst. Analyze the following contract data for potential risks, anomalies, or standard compliance."
          },
          { role: "user", content: textData }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const tokens = data.usage?.total_tokens || 0;
    const cost = tokens * (this.costPer1kTokens / 1000);

    return {
      analysis: data.choices[0]?.message?.content || '',
      tokensUsed: tokens,
      estimatedCost: cost,
      model: this.model,
      provider: 'openai'
    };
  }
}
