import { Contrato } from '../types';
import { 
  RepeatedObjectGroup, 
  SimilarObjectGroup, 
  CitizenIndicator, 
  ContractorAggregate, 
  MultiContractorAggregate 
} from '../components/metricas/types';
import { normalizeName, formatCOP } from './helpers';

/**
 * METRICS & MATHEMATICAL CALCULATIONS ENGINE
 * 
 * Centralizes all statistical, financial, and analytical calculations
 * for SECOP II procurement datasets.
 */

// Global set of stopwords for Colombian public procurement text analysis
export const STOPWORDS = new Set([
  'DE', 'EL', 'LA', 'Y', 'EN', 'CON', 'A', 'POR', 'PARA', 'DEL', 'LOS', 'LAS', 'AL', 'E', 'O', 'U', 
  'SU', 'SUS', 'CONTRATO', 'PRESTACION', 'SERVICIOS', 'MUNICIPIO', 'APOYO', 'GESTION', 'ACTIVIDADES',
  'OBJETO', 'SOBRE', 'ESTE', 'ESTO', 'ESTA', 'FLORENCIA', 'CAQUETA', 'COMO', 'QUE',
  'MUNICIPAL', 'DESPACHO', 'DISTRITO', 'DEPARTAMENTO', 'ALCALDIA', 'GOBERNACION', 'TERMINOS'
]);

/**
 * Tokenizes and filters text for lexical similarity calculations.
 */
export function getNormalizedWords(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
    
  const words = normalized.split(/[^A-Z0-9]+/).filter(w => {
    return w.length > 3 && !STOPWORDS.has(w);
  });
  
  return Array.from(new Set(words));
}

/**
 * Computes Jaccard Similarity Coefficient between two sets of tokens:
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function computeJaccardWithSets(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let intersectionCount = 0;
  const smaller = setA.size <= setB.size ? setA : setB;
  const larger = setA.size <= setB.size ? setB : setA;

  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionCount++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * 1. Financial Aggregations
 * Computes global monetary sums (contracted, paid, pending payment, pending execution)
 * and distinct supervisor/contractor counts.
 */
export function calculateFinancialStats(contratos: Contrato[]) {
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
}

/**
 * 2. Monthly Signature Distribution
 * Groups contracts by signature month (01-12) to derive volume and monetary trends.
 */
export function calculateMonthlySignatureData(contratos: Contrato[]) {
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
}

/**
 * 3. Status Distribution
 */
export function calculateStatusDistribution(contratos: Contrato[]) {
  const statusMap: { [key: string]: number } = {};
  contratos.forEach(c => {
    const st = c.estado_contrato || 'No especificado';
    statusMap[st] = (statusMap[st] || 0) + 1;
  });

  return Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * 4. Modality Distribution
 */
export function calculateModalityDistribution(contratos: Contrato[]) {
  const modalityMap: { [key: string]: number } = {};
  contratos.forEach(c => {
    const mod = c.modalidad_de_contratacion || 'No especificada';
    modalityMap[mod] = (modalityMap[mod] || 0) + 1;
  });

  return Object.entries(modalityMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

/**
 * 5. Contract Types Distribution
 */
export function calculateTypeDistribution(contratos: Contrato[]) {
  const map: { [key: string]: number } = {};
  contratos.forEach(c => {
    const type = c.tipo_de_contrato || 'No especificado';
    map[type] = (map[type] || 0) + 1;
  });

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * 6. Exact Repeated Objects Detection
 * Groups contracts with 100% identical wording (normalized) to highlight potential copy-paste templates.
 */
export function calculateRepeatedObjects(contratos: Contrato[]): RepeatedObjectGroup[] {
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
}

/**
 * 7. Citizen Control Risk Indicators
 * Evaluates risk criteria (modifications, added days, expired active contracts, advance payments, pending balances).
 */
export function calculateCitizenIndicators(contratos: Contrato[], referenceDate: Date = new Date('2026-07-17')): CitizenIndicator[] {
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
      if (finDate < referenceDate) {
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

  return [
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
}

/**
 * 8. Contractor Aggregations
 * Aggregates contractors by NIT/Name and calculates total contract sums and volume.
 */
export function calculateContractorAggregates(contratos: Contrato[]): ContractorAggregate[] {
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
}

/**
 * 9. Multi-Contractors (Recurrent Contractors)
 * Filters contractors with 2+ awarded contracts and ranks them by contract count and monetary volume.
 */
export function calculateMultiContractors(contratos: Contrato[]): MultiContractorAggregate[] {
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
}
