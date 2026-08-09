import { Contrato } from '../types';

export interface ProviderStat {
  name: string;
  count: number;
  totalValue: number;
  percent: number;
}

export interface ModalityStat {
  name: string;
  count: number;
  totalValue: number;
  percent: number;
}

export interface TypeStat {
  name: string;
  count: number;
  totalValue: number;
  percent: number;
}

export interface SectorStat {
  name: string;
  count: number;
  totalValue: number;
  percent: number;
}

export interface MonthlyAnalysisResult {
  // Averages for the whole year/dataset
  avgContractsPerMonth: number;
  avgValuePerMonth: number;

  // Selected month metrics
  count: number;
  totalValue: number;
  avgValue: number;
  medianValue: number;
  maxContract: Contrato | null;
  minContract: Contrato | null;

  // Comparisons with average
  countPercentDiff: number; // e.g. -95%
  valuePercentDiff: number; // e.g. +120%
  countRelationText: string; // e.g. "95% por debajo del promedio"
  valueRelationText: string; // e.g. "120% por encima del promedio"

  // Anomalies / Semaphore
  status: 'atípicamente-baja' | 'pico-extremo' | 'superior-promedio' | 'inferior-promedio' | 'normal';
  statusLabel: string;
  statusColor: 'emerald' | 'rose' | 'amber';
  statusDescription: string;
  possibleCauses: string[];

  // Concentration
  top1Percent: number;
  top5Percent: number;
  top1Value: number;
  top5ValueSum: number;
  hasHighConcentration: boolean;

  // Provider Concentration
  topProviders: ProviderStat[];
  topProvidersPercent: number;

  // Modalities
  topModalities: ModalityStat[];
  primaryModalityLabel: string;

  // Types
  topTypes: TypeStat[];
  primaryTypeLabel: string;

  // Sectors
  topSectors: SectorStat[];
  primarySectorLabel: string;

  // Temporal Execution
  last5DaysCount: number;
  last5DaysPercent: number;
  isLastWeekConcentrated: boolean;

  // Activity Index
  activityScore: number;
  activityLevel: 'muy-baja' | 'baja' | 'normal' | 'alta' | 'muy-alta';
  activityLabel: string;
}

/**
 * Normalizes provider names to aggregate them cleanly
 */
function normalizeName(name: string): string {
  if (!name) return 'No especificado';
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
}

export function analyzeMonth(
  contratos: Contrato[],
  monthKey: string
): MonthlyAnalysisResult {
  // 1. Calculate historical baseline and denominator
  let maxMonthWithData = 1;
  const yearlyTotalValue = contratos.reduce((sum, c) => {
    const val = Number(c.valor_del_contrato) || 0;
    if (c.fecha_de_firma) {
      const match = c.fecha_de_firma.match(/^\d{4}-(\d{2})-\d{2}/);
      if (match) {
        const m = parseInt(match[1], 10);
        if (m > maxMonthWithData) {
          maxMonthWithData = m;
        }
      }
    }
    return sum + val;
  }, 0);

  const monthDenominator = maxMonthWithData;
  const avgContractsPerMonth = contratos.length / monthDenominator;
  const avgValuePerMonth = yearlyTotalValue / monthDenominator;

  // 2. Filter contracts for selected month
  const selectedMonthContracts = contratos.filter(c => {
    if (!c.fecha_de_firma) return false;
    const match = c.fecha_de_firma.match(/^\d{4}-(\d{2})-\d{2}/);
    return match && match[1] === monthKey;
  });

  const count = selectedMonthContracts.length;
  const totalValue = selectedMonthContracts.reduce((sum, c) => sum + (Number(c.valor_del_contrato) || 0), 0);
  const avgValue = count > 0 ? totalValue / count : 0;

  // 3. Median value
  const sortedValues = selectedMonthContracts
    .map(c => Number(c.valor_del_contrato) || 0)
    .sort((a, b) => a - b);
  let medianValue = 0;
  if (sortedValues.length > 0) {
    const mid = Math.floor(sortedValues.length / 2);
    medianValue = sortedValues.length % 2 !== 0 
      ? sortedValues[mid] 
      : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }

  // Max and Min contracts
  let maxContract: Contrato | null = null;
  let minContract: Contrato | null = null;
  selectedMonthContracts.forEach(c => {
    const val = Number(c.valor_del_contrato) || 0;
    if (val > 0) {
      if (!maxContract || val > (Number(maxContract.valor_del_contrato) || 0)) {
        maxContract = c;
      }
      if (!minContract || val < (Number(minContract.valor_del_contrato) || 0)) {
        minContract = c;
      }
    }
  });

  // 4. Comparison relative changes
  const countPercentDiff = avgContractsPerMonth > 0 
    ? ((count - avgContractsPerMonth) / avgContractsPerMonth) * 100 
    : 0;
  const valuePercentDiff = avgValuePerMonth > 0 
    ? ((totalValue - avgValuePerMonth) / avgValuePerMonth) * 100 
    : 0;

  const countRelationText = countPercentDiff >= 0
    ? `${countPercentDiff.toFixed(0)}% por encima del promedio mensual`
    : `${Math.abs(countPercentDiff).toFixed(0)}% por debajo del promedio mensual`;

  const valueRelationText = valuePercentDiff >= 0
    ? `${valuePercentDiff.toFixed(0)}% por encima del promedio mensual`
    : `${Math.abs(valuePercentDiff).toFixed(0)}% por debajo del promedio mensual`;

  // 5. Anomalies & Semaphore Detection
  let status: MonthlyAnalysisResult['status'] = 'normal';
  let statusLabel = 'Actividad normal';
  let statusColor: MonthlyAnalysisResult['statusColor'] = 'emerald';
  let statusDescription = 'La contratación se encuentra en línea con el comportamiento histórico habitual de la entidad.';
  const possibleCauses: string[] = [];

  if (count === 0) {
    status = 'atípicamente-baja';
    statusLabel = 'Sin actividad reportada';
    statusColor = 'amber';
    statusDescription = 'No se registran firmas de contratos oficiales durante este periodo.';
    possibleCauses.push('Inicio de una nueva vigencia fiscal (retrasos de planeación).');
    possibleCauses.push('Transición administrativa de fin de año o consolidación de metas anuales.');
  } else if (totalValue > 3 * avgValuePerMonth && count > 1.5 * avgContractsPerMonth) {
    status = 'pico-extremo';
    statusLabel = 'Pico de contratación atípico';
    statusColor = 'rose';
    statusDescription = `Se observa un volumen y presupuesto extraordinariamente altos, superando por más de 3 veces el promedio monetario mensual (${valueRelationText}).`;
    possibleCauses.push('Adjudicación simultánea de grandes licitaciones u obras civiles.');
    possibleCauses.push('Cierre de vigencia fiscal (afán de ejecución presupuestal antes de expirar recursos).');
    possibleCauses.push('Contrataciones de emergencia o compras masivas de suministros.');
  } else if (count < 0.25 * avgContractsPerMonth && avgContractsPerMonth >= 3) {
    status = 'atípicamente-baja';
    statusLabel = 'Contratación atípicamente baja';
    statusColor = 'rose';
    statusDescription = `El volumen de contratos firmados (${count}) está sumamente rezagado frente al comportamiento habitual de la entidad (${countRelationText}).`;
    possibleCauses.push('Estancamiento en la publicación de información por demoras administrativas.');
    possibleCauses.push('Periodo de veda electoral o Ley de Garantías que restringe la contratación directa.');
    possibleCauses.push('Primeros meses de gestión de nuevos equipos de gobierno (reajuste contractual).');
  } else if (totalValue > 1.5 * avgValuePerMonth) {
    status = 'superior-promedio';
    statusLabel = 'Actividad superior al promedio';
    statusColor = 'amber';
    statusDescription = `La entidad comprometió recursos por un valor superior al promedio mensual habitual del año (${valueRelationText}).`;
    possibleCauses.push('Ejecución de proyectos de inversión específicos aprobados para este trimestre.');
    possibleCauses.push('Contratos de prestación de servicios para reforzar la planta operativa.');
  } else if (count < 0.6 * avgContractsPerMonth) {
    status = 'inferior-promedio';
    statusLabel = 'Actividad inferior al promedio';
    statusColor = 'amber';
    statusDescription = `La cantidad de contratos firmados se sitúa por debajo de los valores regulares (${countRelationText}).`;
    possibleCauses.push('Fase intermedia de planeación de proyectos mayores.');
    possibleCauses.push('Desaceleración temporal en el flujo contractual del periodo.');
  } else {
    // Normal activity potential causes
    possibleCauses.push('Flujo ordinario de operaciones administrativas.');
    possibleCauses.push('Ejecución controlada bajo el plan anual de adquisiciones.');
  }

  // 6. Concentration Analysis (Top Contracts)
  const sortedMonthContracts = [...selectedMonthContracts].sort((a, b) => {
    return (Number(b.valor_del_contrato) || 0) - (Number(a.valor_del_contrato) || 0);
  });

  const top1Value = sortedMonthContracts[0] ? Number(sortedMonthContracts[0].valor_del_contrato) || 0 : 0;
  const top1Percent = totalValue > 0 ? (top1Value / totalValue) * 100 : 0;

  const top5ValueSum = sortedMonthContracts.slice(0, 5).reduce((sum, c) => sum + (Number(c.valor_del_contrato) || 0), 0);
  const top5Percent = totalValue > 0 ? (top5ValueSum / totalValue) * 100 : 0;
  const hasHighConcentration = top1Percent >= 60 || (count >= 5 && top5Percent >= 85);

  // 7. Provider Concentration
  const providerMap: { [key: string]: { count: number; total: number; rawName: string } } = {};
  selectedMonthContracts.forEach(c => {
    const raw = c.proveedor_adjudicado || 'No especificado';
    const key = normalizeName(raw);
    if (!providerMap[key]) {
      providerMap[key] = { count: 0, total: 0, rawName: raw };
    }
    providerMap[key].count += 1;
    providerMap[key].total += Number(c.valor_del_contrato) || 0;
  });

  const topProviders: ProviderStat[] = Object.values(providerMap)
    .map(p => ({
      name: p.rawName,
      count: p.count,
      totalValue: p.total,
      percent: totalValue > 0 ? (p.total / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 3);

  const topProvidersPercent = topProviders.reduce((sum, p) => sum + p.percent, 0);

  // 8. Modalities analysis
  const modalityMap: { [key: string]: { count: number; total: number } } = {};
  selectedMonthContracts.forEach(c => {
    const key = c.modalidad_de_contratacion || 'No especificada';
    if (!modalityMap[key]) {
      modalityMap[key] = { count: 0, total: 0 };
    }
    modalityMap[key].count += 1;
    modalityMap[key].total += Number(c.valor_del_contrato) || 0;
  });

  const topModalities: ModalityStat[] = Object.entries(modalityMap)
    .map(([name, m]) => ({
      name,
      count: m.count,
      totalValue: m.total,
      percent: totalValue > 0 ? (m.total / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  let primaryModalityLabel = 'Sin datos';
  if (topModalities.length > 0) {
    const primary = topModalities[0];
    primaryModalityLabel = `La mayor parte del presupuesto asignado (${primary.percent.toFixed(1)}%) fue adjudicada mediante ${primary.name}.`;
  }

  // 9. Contract Types analysis
  const typeMap: { [key: string]: { count: number; total: number } } = {};
  selectedMonthContracts.forEach(c => {
    const key = c.tipo_de_contrato || 'No especificado';
    if (!typeMap[key]) {
      typeMap[key] = { count: 0, total: 0 };
    }
    typeMap[key].count += 1;
    typeMap[key].total += Number(c.valor_del_contrato) || 0;
  });

  const topTypes: TypeStat[] = Object.entries(typeMap)
    .map(([name, m]) => ({
      name,
      count: m.count,
      totalValue: m.total,
      percent: totalValue > 0 ? (m.total / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  let primaryTypeLabel = 'Sin datos';
  if (topTypes.length > 0) {
    const primary = topTypes[0];
    primaryTypeLabel = `Predominan los contratos de tipo ${primary.name} con el ${primary.percent.toFixed(1)}% de los recursos financieros comprometidos.`;
  }

  // 10. Sectors analysis
  const sectorMap: { [key: string]: { count: number; total: number } } = {};
  selectedMonthContracts.forEach(c => {
    const key = c.sector || 'Otros/No especificado';
    if (!sectorMap[key]) {
      sectorMap[key] = { count: 0, total: 0 };
    }
    sectorMap[key].count += 1;
    sectorMap[key].total += Number(c.valor_del_contrato) || 0;
  });

  const topSectors: SectorStat[] = Object.entries(sectorMap)
    .map(([name, m]) => ({
      name,
      count: m.count,
      totalValue: m.total,
      percent: totalValue > 0 ? (m.total / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  let primarySectorLabel = 'Sin datos';
  if (topSectors.length > 0) {
    const primary = topSectors[0];
    primarySectorLabel = `El gasto sectorial principal estuvo orientado a ${primary.name} acaparando el ${primary.percent.toFixed(1)}% del presupuesto mensual.`;
  }

  // 11. Temporal Execution (Last 5 days of the month concentration)
  const last5DaysCount = selectedMonthContracts.filter(c => {
    if (!c.fecha_de_firma) return false;
    const match = c.fecha_de_firma.match(/^\d{4}-\d{2}-(\d{2})/);
    if (match) {
      const d = parseInt(match[1], 10);
      return d >= 26; // Last days of month (26th to 31st)
    }
    return false;
  }).length;

  const last5DaysPercent = count > 0 ? (last5DaysCount / count) * 100 : 0;
  const isLastWeekConcentrated = count >= 3 && last5DaysPercent >= 60;

  // 12. Activity Index & Behavioral Score (0 to 100)
  // Let's compute a score reflecting the activity. Normal activity is around 50 points.
  // Count ratio: how active is the contract count compared to avg contracts.
  const countRatio = avgContractsPerMonth > 0 ? count / avgContractsPerMonth : 0;
  const valueRatio = avgValuePerMonth > 0 ? totalValue / avgValuePerMonth : 0;

  // Combination: 40% count weight + 60% value weight
  // Cap at ratio of 2.0, representing high activity
  const cappedCountRatio = Math.min(2.0, countRatio);
  const cappedValueRatio = Math.min(2.0, valueRatio);

  let activityScore = Math.round(((cappedCountRatio * 0.4) + (cappedValueRatio * 0.6)) * 50);
  if (count === 0) {
    activityScore = 0;
  }

  let activityLevel: MonthlyAnalysisResult['activityLevel'] = 'normal';
  let activityLabel = 'Actividad normal';

  if (activityScore <= 15) {
    activityLevel = 'muy-baja';
    activityLabel = 'Muy baja';
  } else if (activityScore <= 40) {
    activityLevel = 'baja';
    activityLabel = 'Baja';
  } else if (activityScore <= 70) {
    activityLevel = 'normal';
    activityLabel = 'Normal';
  } else if (activityScore <= 90) {
    activityLevel = 'alta';
    activityLabel = 'Alta';
  } else {
    activityLevel = 'muy-alta';
    activityLabel = 'Muy alta';
  }

  return {
    avgContractsPerMonth,
    avgValuePerMonth,
    count,
    totalValue,
    avgValue,
    medianValue,
    maxContract,
    minContract,
    countPercentDiff,
    valuePercentDiff,
    countRelationText,
    valueRelationText,
    status,
    statusLabel,
    statusColor,
    statusDescription,
    possibleCauses,
    top1Percent,
    top5Percent,
    top1Value,
    top5ValueSum,
    hasHighConcentration,
    topProviders,
    topProvidersPercent,
    topModalities,
    primaryModalityLabel,
    topTypes,
    primaryTypeLabel,
    topSectors,
    primarySectorLabel,
    last5DaysCount,
    last5DaysPercent,
    isLastWeekConcentrated,
    activityScore,
    activityLevel,
    activityLabel,
  };
}
