import { PlanLimits } from './Plan';

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  limites: PlanLimits;
  consumo: Partial<PlanLimits>;
  vigencia: Date;
}
