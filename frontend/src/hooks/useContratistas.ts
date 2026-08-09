import { useState, useMemo } from 'react';
import { Contrato } from '../types';
import { calculateContractorAggregates, calculateMultiContractors } from '../utils/metricsEngine';

export function useContratistas(contratos: Contrato[], initialLimit: number = 10) {
  const [limiteContratistas, setLimiteContratistas] = useState<number>(initialLimit);

  // Calculate top contractors (aggregated)
  const allSortedContractors = useMemo(() => {
    return calculateContractorAggregates(contratos);
  }, [contratos]);

  // Dynamic slice based on user slider/limit input
  const topContractors = useMemo(() => {
    return allSortedContractors.slice(0, limiteContratistas);
  }, [allSortedContractors, limiteContratistas]);

  // Calculate multi-contractors (contractors with more than 1 contract)
  const multiContractors = useMemo(() => {
    return calculateMultiContractors(contratos);
  }, [contratos]);

  return {
    limiteContratistas,
    setLimiteContratistas,
    allSortedContractors,
    topContractors,
    multiContractors,
  };
}
