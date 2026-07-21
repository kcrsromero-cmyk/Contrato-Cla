import { useState, useMemo } from 'react';
import { Contrato } from '../types';
import { ContractorAggregate, MultiContractorAggregate } from '../components/metricas/types';
import { normalizeName } from '../utils/helpers';

export function useContratistas(contratos: Contrato[], initialLimit: number = 10) {
  const [limiteContratistas, setLimiteContratistas] = useState<number>(initialLimit);

  // Calculate top contractors (aggregated)
  const allSortedContractors = useMemo(() => {
    const map: { [key: string]: ContractorAggregate } = {};

    contratos.forEach(c => {
      const nameRaw = c.proveedor_adjudicado?.trim() || 'No especificado';
      const doc = c.documento_proveedor?.trim() || 'No registrado';
      const key = `${nameRaw.toUpperCase()}::${doc}`;

      if (!map[key]) {
        map[key] = {
          nombre: nameRaw !== 'No especificado' ? normalizeName(nameRaw) : 'No especificado',
          documento: doc,
          totalContratos: 0,
          valorTotal: 0,
          tipoDoc: c.tipodocproveedor || 'NIT/CC',
          contratos: []
        };
      }

      map[key].totalContratos += 1;
      map[key].valorTotal += Number(c.valor_del_contrato) || 0;
      map[key].contratos.push(c);
    });

    return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [contratos]);

  // Dynamic slice based on user slider/limit input
  const topContractors = useMemo(() => {
    return allSortedContractors.slice(0, limiteContratistas);
  }, [allSortedContractors, limiteContratistas]);

  // Calculate multi-contractors (contractors with more than 1 contract)
  const multiContractors = useMemo(() => {
    const map: { [key: string]: MultiContractorAggregate } = {};

    contratos.forEach(c => {
      const nameRaw = c.proveedor_adjudicado?.trim() || 'No especificado';
      const doc = c.documento_proveedor?.trim() || 'No registrado';
      const key = `${nameRaw.toUpperCase()}::${doc}`;

      if (!map[key]) {
        map[key] = {
          nombre: nameRaw !== 'No especificado' ? normalizeName(nameRaw) : 'No especificado',
          documento: doc,
          totalContratos: 0,
          valorTotal: 0,
          tipoDoc: c.tipodocproveedor || 'NIT/CC',
          contratos: []
        };
      }

      map[key].totalContratos += 1;
      map[key].valorTotal += Number(c.valor_del_contrato) || 0;
      map[key].contratos.push(c);
    });

    return Object.values(map)
      .filter(c => c.totalContratos > 1)
      .sort((a, b) => {
        if (b.totalContratos !== a.totalContratos) {
          return b.totalContratos - a.totalContratos;
        }
        return b.valorTotal - a.valorTotal;
      });
  }, [contratos]);

  return {
    limiteContratistas,
    setLimiteContratistas,
    allSortedContractors,
    topContractors,
    multiContractors,
  };
}
