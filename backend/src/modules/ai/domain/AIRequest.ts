export interface AIRequest {
  id: string;
  proveedor: string; // e.g., 'openai', 'anthropic', 'deepseek'
  modelo: string;    // e.g., 'gpt-4o', 'claude-3-opus'
  tokens: number;
  costo: number;
  usuario: string;   // User UUID
  organizacion: string; // Organization UUID
}
