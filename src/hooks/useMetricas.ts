import { useMemo } from 'react';
import { Contrato } from '../types';
import { RepeatedObjectGroup, SimilarObjectGroup, CitizenIndicator } from '../components/metricas/types';
import { normalizeName, formatCOP } from '../utils/helpers';

export function useMetricas(contratos: Contrato[]) {
  // --- 1. Aggregated financial statistics (from ResumenView) ---
  const stats = useMemo(() => {
    let totalContratos = contratos.length;
    let valorContratado = 0;
    let valorPagado = 0;
    let valorPendientePago = 0;
    let valorPendienteEjecucion = 0;

    const supervisoresSet = new Set<string>();
    const contratistasSet = new Set<string>();

    contratos.forEach(c => {
      valorContratado += Number(c.valor_del_contrato) || 0;
      valorPagado += Number(c.valor_pagado) || 0;
      valorPendientePago += Number(c.valor_pendiente_de_pago) || 0;
      valorPendienteEjecucion += Number(c.valor_pendiente_de_ejecucion) || 0;

      if (c.nombre_supervisor && c.nombre_supervisor !== 'No especificado') {
        supervisoresSet.add(c.nombre_supervisor.toUpperCase());
      }
      if (c.proveedor_adjudicado && c.proveedor_adjudicado !== 'No especificado') {
        contratistasSet.add(c.proveedor_adjudicado.toUpperCase());
      }
    });

    return {
      totalContratos,
      valorContratado,
      valorPagado,
      valorPendientePago,
      valorPendienteEjecucion,
      totalSupervisores: supervisoresSet.size,
      totalContratistas: contratistasSet.size
    };
  }, [contratos]);

  // --- 2. Monthly Signature trend data (from ResumenView) ---
  const monthlyData = useMemo(() => {
    const monthlyMap: { [key: string]: { name: string; total: number; count: number } } = {};
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    months.forEach((m, idx) => {
      const key = (idx + 1).toString().padStart(2, '0');
      monthlyMap[key] = { name: m, total: 0, count: 0 };
    });

    contratos.forEach(c => {
      if (!c.fecha_de_firma) return;
      const match = c.fecha_de_firma.match(/^\d{4}-(\d{2})-\d{2}/);
      if (match) {
        const monthKey = match[1];
        if (monthlyMap[monthKey]) {
          monthlyMap[monthKey].total += Number(c.valor_del_contrato) || 0;
          monthlyMap[monthKey].count += 1;
        }
      }
    });

    return Object.keys(monthlyMap)
      .sort()
      .map(key => ({
        key,
        name: monthlyMap[key].name,
        'Valor Contratado': monthlyMap[key].total,
        'Cantidad Contratos': monthlyMap[key].count
      }));
  }, [contratos]);

  // --- 3. Status distribution data (from ResumenView) ---
  const statusData = useMemo(() => {
    const statusMap: { [key: string]: number } = {};
    contratos.forEach(c => {
      const st = c.estado_contrato || 'No especificado';
      statusMap[st] = (statusMap[st] || 0) + 1;
    });

    return Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contratos]);

  // --- 4. Modality distribution data (from ResumenView) ---
  const modalityData = useMemo(() => {
    const modalityMap: { [key: string]: number } = {};
    contratos.forEach(c => {
      const mod = c.modalidad_de_contratacion || 'No especificada';
      modalityMap[mod] = (modalityMap[mod] || 0) + 1;
    });

    return Object.entries(modalityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 modalities
  }, [contratos]);

  // --- 5. Contract Types distribution data (from MetricasView) ---
  const typeData = useMemo(() => {
    const map: { [key: string]: number } = {};
    contratos.forEach(c => {
      const type = c.tipo_de_contrato || 'No especificado';
      map[type] = (map[type] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contratos]);

  // --- 6. Repeated objects groupings (from MetricasView) ---
  const repeatedObjects = useMemo(() => {
    const groups: { [key: string]: Contrato[] } = {};

    contratos.forEach(c => {
      const obj = c.objeto_del_contrato?.trim();
      if (!obj) return;
      
      const normalizedKey = obj.toUpperCase().replace(/\s+/g, ' ');
      
      if (!groups[normalizedKey]) {
        groups[normalizedKey] = [];
      }
      groups[normalizedKey].push(c);
    });

    return Object.entries(groups)
      .map(([key, list]) => {
        const totalValue = list.reduce((acc, c) => acc + (Number(c.valor_del_contrato) || 0), 0);
        const contractorsSet = new Set<string>();
        list.forEach(c => {
          if (c.proveedor_adjudicado) {
            contractorsSet.add(normalizeName(c.proveedor_adjudicado));
          }
        });
        return {
          normalizedObject: key,
          originalObject: list[0].objeto_del_contrato || '',
          contracts: list,
          count: list.length,
          totalValue,
          contractors: Array.from(contractorsSet),
        };
      })
      .filter(group => group.count > 1)
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.totalValue - a.totalValue;
      });
  }, [contratos]);

  // --- 7. Similar objects groups using Jaccard similarity (from MetricasView) ---
  const similarObjectsGroups = useMemo(() => {
    const exactGroups: { [key: string]: { originalObject: string; contracts: Contrato[] } } = {};
    
    contratos.forEach(c => {
      const obj = c.objeto_del_contrato?.trim();
      if (!obj) return;
      const normalizedKey = obj.toUpperCase().replace(/\s+/g, ' ');
      if (!exactGroups[normalizedKey]) {
        exactGroups[normalizedKey] = {
          originalObject: obj,
          contracts: []
        };
      }
      exactGroups[normalizedKey].contracts.push(c);
    });

    const stopwords = new Set([
      'DE', 'EL', 'LA', 'Y', 'EN', 'CON', 'A', 'POR', 'PARA', 'DEL', 'LOS', 'LAS', 'AL', 'E', 'O', 'U', 
      'SU', 'SUS', 'CONTRATO', 'PRESTACION', 'SERVICIOS', 'MUNICIPIO', 'APOYO', 'GESTION', 'ACTIVIDADES',
      'OBJETO', 'SOBRE', 'ESTE', 'ESTO', 'ESTA', 'FLORENCIA', 'CAQUETA', 'COMO', 'QUE',
      'MUNICIPAL', 'DESPACHO', 'DISTRITO', 'DEPARTAMENTO', 'ALCALDIA', 'GOBERNACION', 'TERMINOS'
    ]);

    function getNormalizedWords(text: string): string[] {
      if (!text) return [];
      const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
        
      const words = normalized.split(/[^A-Z0-9]+/).filter(w => {
        return w.length > 3 && !stopwords.has(w);
      });
      
      return Array.from(new Set(words));
    }

    function computeJaccardSimilarity(wordsA: string[], wordsB: string[]): number {
      if (wordsA.length === 0 || wordsB.length === 0) return 0;
      const setA = new Set(wordsA);
      const setB = new Set(wordsB);
      
      let intersectionCount = 0;
      for (const item of setA) {
        if (setB.has(item)) {
          intersectionCount++;
        }
      }
      
      const unionSize = setA.size + setB.size - intersectionCount;
      return unionSize > 0 ? intersectionCount / unionSize : 0;
    }

    const uniqueObjectsList = Object.entries(exactGroups).map(([key, value]) => {
      return {
        key,
        originalObject: value.originalObject,
        contracts: value.contracts,
        words: getNormalizedWords(value.originalObject)
      };
    }).filter(item => item.words.length > 0);

    const pool = [...uniqueObjectsList];
    const clusters: SimilarObjectGroup[] = [];

    pool.sort((a, b) => b.contracts.length - a.contracts.length);

    while (pool.length > 0) {
      const rep = pool.shift();
      if (!rep) break;

      const clusterMembers = [rep];
      const indicesToRemove: number[] = [];

      for (let i = 0; i < pool.length; i++) {
        const other = pool[i];
        const sim = computeJaccardSimilarity(rep.words, other.words);
        if (sim >= 0.55) {
          clusterMembers.push(other);
          indicesToRemove.push(i);
        }
      }

      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        pool.splice(indicesToRemove[i], 1);
      }

      if (clusterMembers.length >= 2) {
        const allContracts = clusterMembers.flatMap(m => m.contracts);
        const totalValue = allContracts.reduce((acc, c) => acc + (Number(c.valor_del_contrato) || 0), 0);
        const uniqueObjects = Array.from(new Set(clusterMembers.map(m => m.originalObject)));
        
        const contractorsSet = new Set<string>();
        allContracts.forEach(c => {
          if (c.proveedor_adjudicado) {
            contractorsSet.add(normalizeName(c.proveedor_adjudicado));
          }
        });

        clusters.push({
          representativeObject: rep.originalObject,
          contracts: allContracts,
          uniqueObjects,
          totalValue,
          count: allContracts.length,
          uniqueContractors: Array.from(contractorsSet)
        });
      }
    }

    return clusters.sort((a, b) => b.count - a.count);
  }, [contratos]);

  // --- 8. Citizen Warning Indicators (from MetricasView) ---
  const citizenIndicators = useMemo(() => {
    const hoy = new Date('2026-07-17'); // Consistent app context execution date

    const modificadosList: Contrato[] = [];
    const diasAdicionadosList: Contrato[] = [];
    const vencidosEnEjecucionList: Contrato[] = [];
    const pagoAdelantadoList: Contrato[] = [];
    const pendienteEjecucionList: Contrato[] = [];

    contratos.forEach(c => {
      if (c.estado_contrato?.toLowerCase().includes('modificado')) {
        modificadosList.push(c);
      }
      if ((Number(c.dias_adicionados) || 0) > 0) {
        diasAdicionadosList.push(c);
      }
      if (c.estado_contrato?.toLowerCase().includes('ejecucion') && c.fecha_de_fin_del_contrato) {
        const finDate = new Date(c.fecha_de_fin_del_contrato.split('T')[0]);
        if (finDate < hoy) {
          vencidosEnEjecucionList.push(c);
        }
      }
      if ((Number(c.valor_de_pago_adelantado) || 0) > 0) {
        pagoAdelantadoList.push(c);
      }
      if ((Number(c.valor_pendiente_de_ejecucion) || 0) > 0) {
        pendienteEjecucionList.push(c);
      }
    });

    const indicators: CitizenIndicator[] = [
      {
        id: 'modificados',
        title: 'Contratos Modificados',
        description: 'Contratos que reportan estado formal de modificación en SECOP II.',
        count: modificadosList.length,
        value: null,
        contracts: modificadosList,
        warningLevel: 'low',
        insight: 'Las modificaciones pueden incluir prórrogas, adiciones presupuestales, o cambios de supervisor. Requiere validar el acta de modificación.'
      },
      {
        id: 'dias_adicionados',
        title: 'Días Adicionados',
        description: 'Contratos que registran una ampliación en su plazo de ejecución original.',
        count: diasAdicionadosList.length,
        value: null,
        contracts: diasAdicionadosList,
        warningLevel: 'medium',
        insight: 'Las ampliaciones de plazo postergan la entrega final de obras, bienes o servicios. Útil para verificar dilaciones en obras públicas locales.'
      },
      {
        id: 'vencidos_ejecucion',
        title: 'Vencidos en Ejecución',
        description: 'Contratos con fecha de fin vencida que aún permanecen con estado "En ejecución".',
        count: vencidosEnEjecucionList.length,
        value: null,
        contracts: vencidosEnEjecucionList,
        warningLevel: 'high',
        insight: 'Indica posibles retrasos en la liquidación o contratos activos fuera de plazo. A menudo se debe a demoras en la actualización del SECOP por la entidad.'
      },
      {
        id: 'pago_adelantado',
        title: 'Pago Adelantado Reportado',
        description: 'Contratos que registran desembolsos como anticipos o pagos adelantados autorizados.',
        count: pagoAdelantadoList.length,
        value: formatCOP(pagoAdelantadoList.reduce((acc, c) => acc + (Number(c.valor_de_pago_adelantado) || 0), 0)),
        contracts: pagoAdelantadoList,
        warningLevel: 'medium',
        insight: 'Los pagos adelantados son legales, pero exigen una fiduciaria, garantía única o plan de inversión aprobado por el supervisor público.'
      },
      {
        id: 'pendiente_ejecucion',
        title: 'Saldos por Ejecutar',
        description: 'Contratos con saldos financieros pendientes de entrega física de bienes o servicios.',
        count: pendienteEjecucionList.length,
        value: formatCOP(pendienteEjecucionList.reduce((acc, c) => acc + (Number(c.valor_pendiente_de_ejecucion) || 0), 0)),
        contracts: pendienteEjecucionList,
        warningLevel: 'low',
        insight: 'Corresponde a los recursos remanentes que la entidad debe desembolsar conforme el contratista avance en el cronograma.'
      }
    ];

    return indicators;
  }, [contratos]);

  return {
    stats,
    monthlyData,
    statusData,
    modalityData,
    typeData,
    repeatedObjects,
    similarObjectsGroups,
    citizenIndicators
  };
}
