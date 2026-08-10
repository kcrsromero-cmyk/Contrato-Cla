import { AIRequest } from './AIRequest';

export interface IAIRequestRepository {
  create(request: AIRequest): Promise<AIRequest>;
  findByOrganization(organizationId: string): Promise<AIRequest[]>;
}
