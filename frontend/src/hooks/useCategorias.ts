import { useState, useMemo } from 'react';
import { Contrato } from '../types';
import { CategoriaSpendingSummary, obtenerResumenDeGastos } from '../utils/categorizer';

export function useCategorias(contratos: Contrato[]) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const totalGastado = useMemo(() => {
    return contratos.reduce((acc, c) => acc + (Number(c.valor_del_contrato) || 0), 0);
  }, [contratos]);

  const gastosResumen = useMemo(() => {
    return obtenerResumenDeGastos(contratos);
  }, [contratos]);

  const insights = useMemo(() => {
    const validSummaries = gastosResumen.filter(s => s.contratosCount > 0);
    if (validSummaries.length === 0) return null;
    
    // Sort to find top
    const sorted = [...validSummaries].sort((a, b) => b.totalValor - a.totalValor);
    const top = sorted[0];
    
    // Total contracts
    const totalContratos = gastosResumen.reduce((acc, s) => acc + s.contratosCount, 0);
    
    // Average cost
    const avgCost = totalContratos > 0 ? totalGastado / totalContratos : 0;
    
    return {
      topCategory: top,
      totalContratos,
      avgCost
    };
  }, [gastosResumen, totalGastado]);

  return {
    selectedCategory,
    setSelectedCategory,
    totalGastado,
    gastosResumen,
    insights,
  };
}
