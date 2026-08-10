import { Request, Response } from 'express';
import { AIService } from '../application/AIService';

export class AIController {
  constructor(private readonly aiService: AIService) {}

  async analyzeContract(req: Request, res: Response) {
    try {
      const { contractData } = req.body;
      const user = (req as any).user;

      if (!user || !user.organizationId) {
        return res.status(401).json({ error: 'User must belong to an organization to use AI features' });
      }

      if (!contractData) {
        return res.status(400).json({ error: 'contractData is required in the request body' });
      }

      const result = await this.aiService.analyzeContract(contractData, user.id, user.organizationId);

      res.status(200).json(result);
    } catch (error: any) {
      console.error('AI Analysis error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
}
