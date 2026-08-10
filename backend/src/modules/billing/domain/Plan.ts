export interface PlanLimits {
  consultas: number;
  ia: number;
  api: number;
  webhooks: number;
  integraciones: number;
  usuarios: number;
}

export interface Plan {
  id: string;
  name: string; // e.g., 'Free', 'Starter', 'Professional', 'Enterprise'
  limites: PlanLimits;
}
