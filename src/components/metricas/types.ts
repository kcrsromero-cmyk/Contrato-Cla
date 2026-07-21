import { Contrato } from '../../types';

export interface ContractorAggregate {
  nombre: string;
  documento: string;
  totalContratos: number;
  valorTotal: number;
  tipoDoc: string;
  contratos: Contrato[];
}

export interface MultiContractorAggregate {
  nombre: string;
  documento: string;
  totalContratos: number;
  valorTotal: number;
  tipoDoc: string;
  contratos: Contrato[];
}

export interface LexicalInsight {
  type: 'ortografia' | 'error_tipografico' | 'termino_variable' | 'conector' | 'cierre_estructura' | 'puntuacion';
  title: string;
  description: string;
  examples: { original: string; replacement?: string; count?: number; details?: string }[];
}

export interface RepeatedObjectGroup {
  normalizedObject: string;
  originalObject: string;
  contracts: Contrato[];
  count: number;
  totalValue: number;
  contractors: string[];
}

export interface SimilarObjectGroup {
  representativeObject: string;
  contracts: Contrato[];
  uniqueObjects: string[];
  totalValue: number;
  count: number;
  uniqueContractors: string[];
}

export interface CitizenIndicator {
  id: string;
  title: string;
  description: string;
  count: number;
  value: string | null;
  contracts: Contrato[];
  warningLevel: 'low' | 'medium' | 'high';
  insight: string;
}
