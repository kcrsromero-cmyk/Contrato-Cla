import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ArrowRightLeft, 
  Info,
  CalendarDays,
  Sparkles,
  Scale,
  Activity,
  CheckCircle2,
  PieChart,
  HelpCircle,
  ShieldAlert,
  Sliders,
  Clock,
  ArrowRight
} from 'lucide-react';
import { formatCOP, formatCurrencyMillions } from '../utils/helpers';
import { Contrato } from '../types';
import { analyzeMonth, MonthlyAnalysisResult } from '../utils/monthlyAnalysis';
import { InfoTooltip } from './InfoTooltip';

interface MonthlyItem {
  key: string;
  name: string;
  'Valor Contratado': number;
  'Cantidad Contratos': number;
}

interface ComparativaMensualProps {
  monthlyData: MonthlyItem[];
  contratos: Contrato[];
  selectedMonthKey?: string;
  onSelectMonthKey?: (key: string) => void;
}

export function ComparativaMensual({ 
  monthlyData, 
  contratos,
  selectedMonthKey = 'all',
  onSelectMonthKey
}: ComparativaMensualProps) {

  const fullMonthNames: { [key: string]: string } = {
    'Ene': 'Enero', 'Feb': 'Febrero', 'Mar': 'Marzo', 'Abr': 'Abril',
    'May': 'Mayo', 'Jun': 'Junio', 'Jul': 'Julio', 'Ago': 'Agosto',
    'Sep': 'Septiembre', 'Oct': 'Octubre', 'Nov': 'Noviembre', 'Dic': 'Diciembre'
  };

  // Helper for Millions COP
  const formatCOPInMillones = (cop: number): string => {
    return formatCurrencyMillions(cop);
  };

  // Is "Todos los meses" selected?
  const isAllMonthsSelected = selectedMonthKey === 'all';

  // Find index of selected month when a specific month is chosen
  const selectedIndex = useMemo(() => {
    if (isAllMonthsSelected) return -1;
    const idx = monthlyData.findIndex(m => m.key === selectedMonthKey);
    return idx !== -1 ? idx : 0;
  }, [monthlyData, selectedMonthKey, isAllMonthsSelected]);

  const selectedMonth = selectedIndex >= 0 ? monthlyData[selectedIndex] : null;

  // Run deep statistical citizen analysis for the selected month (if specific month is active)
  const analysisResult = useMemo<MonthlyAnalysisResult | null>(() => {
    if (!selectedMonth || !contratos || contratos.length === 0) return null;
    return analyzeMonth(contratos, selectedMonth.key);
  }, [selectedMonth, contratos]);

  // Calculations for PREVIOUS Month
  const prevMonth = selectedIndex > 0 ? monthlyData[selectedIndex - 1] : null;
  const prevStats = useMemo(() => {
    if (!prevMonth || !selectedMonth) return null;
    const currentVal = selectedMonth['Valor Contratado'];
    const currentCount = selectedMonth['Cantidad Contratos'];
    const prevVal = prevMonth['Valor Contratado'];
    const prevCount = prevMonth['Cantidad Contratos'];

    const valDiff = currentVal - prevVal;
    const valPercent = prevVal > 0 ? (valDiff / prevVal) * 100 : currentVal > 0 ? 100 : 0;

    const countDiff = currentCount - prevCount;
    const countPercent = prevCount > 0 ? (countDiff / prevCount) * 100 : currentCount > 0 ? 100 : 0;

    const prevAvgPerContract = prevCount > 0 ? prevVal / prevCount : 0;

    return {
      valDiff,
      valPercent,
      countDiff,
      countPercent,
      prevAvgPerContract
    };
  }, [selectedMonth, prevMonth]);

  // Calculations for NEXT Month
  const nextMonth = selectedIndex >= 0 && selectedIndex < monthlyData.length - 1 ? monthlyData[selectedIndex + 1] : null;
  const nextStats = useMemo(() => {
    if (!nextMonth || !selectedMonth) return null;
    const currentVal = selectedMonth['Valor Contratado'];
    const currentCount = selectedMonth['Cantidad Contratos'];
    const nextVal = nextMonth['Valor Contratado'];
    const nextCount = nextMonth['Cantidad Contratos'];

    const valDiff = nextVal - currentVal;
    const valPercent = currentVal > 0 ? (valDiff / currentVal) * 100 : nextVal > 0 ? 100 : 0;

    const countDiff = nextCount - currentCount;
    const countPercent = currentCount > 0 ? (countDiff / currentCount) * 100 : nextCount > 0 ? 100 : 0;

    const nextAvgPerContract = nextCount > 0 ? nextVal / nextCount : 0;

    return {
      valDiff,
      valPercent,
      countDiff,
      countPercent,
      nextAvgPerContract
    };
  }, [selectedMonth, nextMonth]);

  // Annual Totals and Metrics for "Todos los meses" view
  const annualSummary = useMemo(() => {
    let totalContracts = 0;
    let totalValue = 0;
    let maxContractsMonth: MonthlyItem | null = null;
    let maxBudgetMonth: MonthlyItem | null = null;
    let minContractsMonth: MonthlyItem | null = null;
    let monthsWithDataCount = 0;

    monthlyData.forEach(m => {
      const cnt = m['Cantidad Contratos'];
      const val = m['Valor Contratado'];
      totalContracts += cnt;
      totalValue += val;

      if (cnt > 0) {
        monthsWithDataCount++;
        if (!maxContractsMonth || cnt > maxContractsMonth['Cantidad Contratos']) {
          maxContractsMonth = m;
        }
        if (!maxBudgetMonth || val > maxBudgetMonth['Valor Contratado']) {
          maxBudgetMonth = m;
        }
        if (!minContractsMonth || cnt < minContractsMonth['Cantidad Contratos']) {
          minContractsMonth = m;
        }
      }
    });

    const avgValuePerContract = totalContracts > 0 ? totalValue / totalContracts : 0;
    const activeMonths = monthsWithDataCount > 0 ? monthsWithDataCount : 12;
    const avgContractsPerMonth = totalContracts / activeMonths;
    const avgValuePerMonth = totalValue / activeMonths;

    // Build Month-over-Month comparison table data
    const monthlyTable = monthlyData.map((m, idx) => {
      const prev = idx > 0 ? monthlyData[idx - 1] : null;
      const cnt = m['Cantidad Contratos'];
      const val = m['Valor Contratado'];
      const avgVal = cnt > 0 ? val / cnt : 0;

      let cntDiffPrev = 0;
      let cntPercentPrev = 0;
      let valDiffPrev = 0;
      let valPercentPrev = 0;

      if (prev) {
        cntDiffPrev = cnt - prev['Cantidad Contratos'];
        cntPercentPrev = prev['Cantidad Contratos'] > 0 ? (cntDiffPrev / prev['Cantidad Contratos']) * 100 : cnt > 0 ? 100 : 0;
        valDiffPrev = val - prev['Valor Contratado'];
        valPercentPrev = prev['Valor Contratado'] > 0 ? (valDiffPrev / prev['Valor Contratado']) * 100 : val > 0 ? 100 : 0;
      }

      return {
        ...m,
        avgVal,
        cntDiffPrev,
        cntPercentPrev,
        valDiffPrev,
        valPercentPrev,
        hasPrev: idx > 0
      };
    });

    return {
      totalContracts,
      totalValue,
      avgValuePerContract,
      avgContractsPerMonth,
      avgValuePerMonth,
      maxContractsMonth,
      maxBudgetMonth,
      minContractsMonth,
      monthlyTable
    };
  }, [monthlyData]);

  const currentMonthName = selectedMonth ? (fullMonthNames[selectedMonth.name] || selectedMonth.name) : '';

  // Render helper for metric variations (neutral palette without green/red bias)
  const renderVariationBadge = (label: string, diff: number, percent: number, isCurrency: boolean = false) => {
    const isPositive = diff >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = 'text-slate-800 bg-slate-100/70 border-slate-200/90 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-200';

    const formattedDiff = isCurrency 
      ? formatCOPInMillones(Math.abs(diff))
      : `${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'contrato' : 'contratos'}`;

    const formattedPercent = `${isPositive ? '+' : '-'}${Math.abs(percent).toFixed(1)}%`;

    return (
      <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono ${colorClass}`}>
        <span className="font-sans font-medium text-slate-500 dark:text-slate-400 text-[11px]">{label}:</span>
        <span className="font-bold flex items-center gap-1.5 text-slate-850 dark:text-slate-100">
          <Icon className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>{isPositive ? 'Aumentó' : 'Disminuyó'} {formattedDiff} ({formattedPercent})</span>
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-8" id="comparativa-mensual-panel">
      
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Variación y Análisis de Contratación Mensual
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Explore el comportamiento temporal, el valor promedio por contrato y las variaciones presupuestales mes a mes.
          </p>
        </div>

        {/* Month Selector Dropdown with "Todos los meses" */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">
            Mes seleccionado:
          </span>
          <select
            value={selectedMonthKey}
            onChange={(e) => {
              if (onSelectMonthKey) {
                onSelectMonthKey(e.target.value);
              }
            }}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-450 transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">📅 Todos los meses (Resumen General)</option>
            {monthlyData.map((m) => (
              <option key={m.key} value={m.key}>
                {fullMonthNames[m.name] || m.name} ({m['Cantidad Contratos']} {m['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TODOS LOS MESES (RESUMEN GENERAL ANUAL Y TABLA MES A MES)        */}
      {/* ========================================================================= */}
      {isAllMonthsSelected ? (
        <div className="space-y-8 animate-fade-in">
          
          {/* Key Annual KPI Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Presupuesto Total */}
            <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 block mb-1">
                💰 Presupuesto Total
                <InfoTooltip 
                  content="Suma total de la cuantía contractual de todas las firmas celebradas en la vigencia." 
                  calculation={`Valor exacto acumulado: ${formatCOP(annualSummary.totalValue)} COP.`}
                />
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono block">
                {formatCOPInMillones(annualSummary.totalValue)}
              </span>
            </div>

            {/* Total Contratos */}
            <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 block mb-1">
                🟢 Total Contratos Firmados
                <InfoTooltip 
                  content="Cantidad total de convenios y contratos suscritos formalmente durante la vigencia." 
                  calculation="Σ (Cantidad de contratos de cada mes)."
                />
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 block">
                {annualSummary.totalContracts} {annualSummary.totalContracts === 1 ? 'contrato' : 'contratos'}
              </span>
              <span className="text-xs font-medium text-slate-500 block mt-0.5">
                Promedio: {annualSummary.avgContractsPerMonth.toFixed(1)} contratos/mes
              </span>
            </div>

            {/* Promedio por Contrato */}
            <div className="bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4.5 rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-indigo-650 dark:text-indigo-400 block mb-1">
                ⚖️ Promedio por Contrato
                <InfoTooltip 
                  content="Valor medio asignado a cada contrato firmado de manera global en el año." 
                  calculation="Presupuesto Total ÷ Total Contratos Firmados."
                />
              </span>
              <span className="text-base font-extrabold text-indigo-950 dark:text-indigo-200 font-mono block">
                {formatCOPInMillones(annualSummary.avgValuePerContract)}
              </span>
              <span className="text-xs font-medium text-slate-500 block mt-0.5">
                Valor medio general por firma
              </span>
            </div>

            {/* Promedio Mensual */}
            <div className="bg-slate-50/60 dark:bg-slate-950/30 border border-slate-200/80 dark:border-slate-800 p-4.5 rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400 block mb-1">
                📊 Promedio Mensual
                <InfoTooltip 
                  content="Presupuesto promedio ejecutado por cada mes activo del año." 
                  calculation="Presupuesto Total ÷ Cantidad de meses con actividad."
                />
              </span>
              <span className="text-base font-extrabold text-slate-800 dark:text-slate-200 font-mono block">
                {formatCOPInMillones(annualSummary.avgValuePerMonth)}
              </span>
              <span className="text-xs font-medium text-slate-500 block mt-0.5">
                Presupuesto promedio por mes
              </span>
            </div>

          </div>

          {/* Highlights Cards (Meses con mayor presupuesto y contratos) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {annualSummary.maxBudgetMonth && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-3xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Pico de Presupuesto
                    <InfoTooltip 
                      content="Mes con el mayor valor acumulado contratado." 
                      calculation="Máximo monto mensual registrado en el año."
                    />
                  </span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-slate-200 block mt-0.5">
                    {fullMonthNames[annualSummary.maxBudgetMonth.name] || annualSummary.maxBudgetMonth.name}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">
                    {formatCOPInMillones(annualSummary.maxBudgetMonth['Valor Contratado'])}
                  </span>
                </div>
                <button
                  onClick={() => onSelectMonthKey && onSelectMonthKey(annualSummary.maxBudgetMonth!.key)}
                  className="px-2.5 py-1.5 text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Ver Mes →
                </button>
              </div>
            )}

            {annualSummary.maxContractsMonth && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-3xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Pico de Contratos Firmados
                    <InfoTooltip 
                      content="Mes con el mayor volumen de procesos contractuales suscritos." 
                      calculation="Máxima cantidad mensual de contratos."
                    />
                  </span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-slate-200 block mt-0.5">
                    {fullMonthNames[annualSummary.maxContractsMonth.name] || annualSummary.maxContractsMonth.name}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono block mt-0.5">
                    {annualSummary.maxContractsMonth['Cantidad Contratos']} contratos
                  </span>
                </div>
                <button
                  onClick={() => onSelectMonthKey && onSelectMonthKey(annualSummary.maxContractsMonth!.key)}
                  className="px-2.5 py-1.5 text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Ver Mes →
                </button>
              </div>
            )}

            {annualSummary.minContractsMonth && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-3xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Menor Volumen
                    <InfoTooltip 
                      content="Mes con la menor cantidad de contratos registrados." 
                      calculation="Mínima cantidad de firmas en un mes con actividad."
                    />
                  </span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-slate-200 block mt-0.5">
                    {fullMonthNames[annualSummary.minContractsMonth.name] || annualSummary.minContractsMonth.name}
                  </span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono block mt-0.5">
                    {annualSummary.minContractsMonth['Cantidad Contratos']} contratos ({formatCOPInMillones(annualSummary.minContractsMonth['Valor Contratado'])})
                  </span>
                </div>
                <button
                  onClick={() => onSelectMonthKey && onSelectMonthKey(annualSummary.minContractsMonth!.key)}
                  className="px-2.5 py-1.5 text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Ver Mes →
                </button>
              </div>
            )}
          </div>

          {/* Month-by-Month Comparison Table for Citizens */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Tabla de Variación Mensual de la Vigencia
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Haga clic en cualquier mes para analizarlo en detalle</span>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl shadow-3xs bg-white dark:bg-slate-950">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="p-3">Mes</th>
                    <th className="p-3 text-right">Contratos</th>
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-right">Promedio / Contrato</th>
                    <th className="p-3 text-right">Variación Contratos</th>
                    <th className="p-3 text-right">Variación Presupuesto</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {annualSummary.monthlyTable.map((row) => {
                    const isPositiveCnt = row.cntDiffPrev >= 0;
                    const isPositiveVal = row.valDiffPrev >= 0;

                    return (
                      <tr 
                        key={row.key} 
                        className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
                        onClick={() => onSelectMonthKey && onSelectMonthKey(row.key)}
                      >
                        <td className="p-3 font-bold text-slate-850 dark:text-slate-200">
                          {fullMonthNames[row.name] || row.name}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                          {row['Cantidad Contratos']}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-850 dark:text-slate-200">
                          {formatCOPInMillones(row['Valor Contratado'])}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                          {row['Cantidad Contratos'] > 0 ? formatCOPInMillones(row.avgVal) : '-'}
                        </td>
                        <td className="p-3 text-right">
                          {row.hasPrev ? (
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {isPositiveCnt ? '▲ +' : '▼ '}{row.cntDiffPrev} ({row.cntPercentPrev > 0 ? '+' : ''}{row.cntPercentPrev.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {row.hasPrev ? (
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {isPositiveVal ? '▲ +' : '▼ '}{formatCOPInMillones(Math.abs(row.valDiffPrev))} ({row.valPercentPrev > 0 ? '+' : ''}{row.valPercentPrev.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectMonthKey) onSelectMonthKey(row.key);
                            }}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mx-auto"
                          >
                            Analizar <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: MES ESPECÍFICO SELECCIONADO (COMPARATIVA TRIANGULAR PREV/CURR/NEXT) */
        /* ========================================================================= */
        <div className="space-y-8 animate-fade-in">
          
          {/* Main Grid: Prev, Selected, Next */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. PREVIOUS MONTH CARD */}
            <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between min-h-[360px] relative transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
              {prevMonth ? (
                <div className="space-y-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Mes Anterior</span>
                      </div>
                      <button
                        onClick={() => onSelectMonthKey && onSelectMonthKey(prevMonth.key)}
                        className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Ir a este mes →
                      </button>
                    </div>

                    <h4 className="text-lg font-extrabold text-slate-850 dark:text-slate-200 mt-3">
                      {fullMonthNames[prevMonth.name] || prevMonth.name}
                    </h4>

                    {prevMonth['Cantidad Contratos'] > 0 ? (
                      <div className="mt-4 space-y-3.5">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block font-medium">
                            💰 Valor total contratado
                            <InfoTooltip 
                              content="Presupuesto global comprometido en convenios y contratos firmados durante este mes." 
                              calculation={`Valor exacto oficial: ${formatCOP(prevMonth['Valor Contratado'])} COP.`}
                            />
                          </span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block font-mono mt-0.5">
                            {formatCOPInMillones(prevMonth['Valor Contratado'])}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block font-medium">
                            🟢 Contratos firmados
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {prevMonth['Cantidad Contratos']} {prevMonth['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block font-medium">
                            ⚖️ Valor promedio por contrato
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                            {formatCOPInMillones(prevMonth['Valor Contratado'] / prevMonth['Cantidad Contratos'])}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-center">
                        <span className="text-xs font-mono font-bold text-slate-500 block">Sin contratos registrados</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 font-mono py-12">
                  <CalendarDays className="w-8 h-8 opacity-30 mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">No hay mes previo</span>
                  <span className="text-[9px] mt-1 text-slate-450">Enero es el inicio del año fiscal</span>
                </div>
              )}
            </div>

            {/* 2. SELECTED MONTH CARD (Base, Main Highlighted) */}
            <div className="bg-indigo-50/15 dark:bg-indigo-950/10 border-2 border-indigo-600 dark:border-indigo-500 rounded-2xl p-5 flex flex-col justify-between min-h-[360px] shadow-sm relative transition-all duration-300">
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/20 blur-xl rounded-full"></div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-2">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold">Mes seleccionado</span>
                  </div>

                  {analysisResult && (
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold font-mono uppercase bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                      {analysisResult.activityLabel}
                    </div>
                  )}
                </div>

                <h4 className="text-xl font-black text-indigo-950 dark:text-white">
                  {currentMonthName}
                </h4>

                {selectedMonth && selectedMonth['Cantidad Contratos'] > 0 ? (
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-900/60 dark:text-indigo-400 block font-bold uppercase tracking-wider">
                        💰 Valor total contratado
                        <InfoTooltip 
                          content="Presupuesto global comprometido en contratos con fecha de firma en este mes." 
                          calculation={`Valor exacto oficial: ${formatCOP(selectedMonth['Valor Contratado'])} COP.`}
                        />
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-slate-100 block font-mono mt-0.5">
                        {formatCOPInMillones(selectedMonth['Valor Contratado'])}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-indigo-900/60 dark:text-indigo-400 block font-bold uppercase tracking-wider">
                        🟢 Contratos firmados
                        <InfoTooltip 
                          content="Número total de contratos suscritos formalmente durante este mes." 
                          calculation="Conteo directo de procesos formalizados en el mes."
                        />
                      </span>
                      <span className="text-base font-black text-slate-800 dark:text-slate-200 block">
                        {selectedMonth['Cantidad Contratos']} {selectedMonth['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-indigo-900/60 dark:text-indigo-400 block font-bold uppercase tracking-wider">
                        ⚖️ Valor promedio por contrato
                        <InfoTooltip 
                          content="Costo medio de cada contratación suscrita en este mes." 
                          calculation="Valor Total Contratado en el Mes ÷ Cantidad de Contratos del Mes."
                        />
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono block">
                        {formatCOPInMillones(selectedMonth['Valor Contratado'] / selectedMonth['Cantidad Contratos'])}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl border border-amber-200/30 text-center">
                    <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 block">Sin contratos firmados</span>
                  </div>
                )}
              </div>

              {/* Variation Highlights from previous month */}
              {prevMonth && prevStats && (
                <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
                  <span className="text-[9px] font-mono text-indigo-800 dark:text-indigo-300 uppercase font-extrabold tracking-wider block">
                    Variación respecto a {fullMonthNames[prevMonth.name] || prevMonth.name}:
                  </span>
                  {renderVariationBadge('Contratos', prevStats.countDiff, prevStats.countPercent)}
                  {renderVariationBadge('Presupuesto', prevStats.valDiff, prevStats.valPercent, true)}
                </div>
              )}
            </div>

            {/* 3. NEXT MONTH CARD */}
            <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between min-h-[360px] relative transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
              {nextMonth ? (
                <div className="space-y-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Mes Siguiente</span>
                      </div>
                      <button
                        onClick={() => onSelectMonthKey && onSelectMonthKey(nextMonth.key)}
                        className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Ir a este mes →
                      </button>
                    </div>

                    <h4 className="text-lg font-extrabold text-slate-850 dark:text-slate-200 mt-3">
                      {fullMonthNames[nextMonth.name] || nextMonth.name}
                    </h4>

                    {nextMonth['Cantidad Contratos'] > 0 ? (
                      <div className="mt-4 space-y-3.5">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block font-medium">
                            💰 Valor total contratado
                            <InfoTooltip 
                              content="Presupuesto global comprometido en convenios y contratos firmados durante este mes." 
                              calculation={`Valor exacto oficial: ${formatCOP(nextMonth['Valor Contratado'])} COP.`}
                            />
                          </span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block font-mono mt-0.5">
                            {formatCOPInMillones(nextMonth['Valor Contratado'])}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block font-medium">
                            🟢 Contratos firmados
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {nextMonth['Cantidad Contratos']} {nextMonth['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block font-medium">
                            ⚖️ Valor promedio por contrato
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                            {formatCOPInMillones(nextMonth['Valor Contratado'] / nextMonth['Cantidad Contratos'])}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-center">
                        <span className="text-xs font-mono font-bold text-slate-500 block">Sin contratos registrados</span>
                      </div>
                    )}
                  </div>

                  {nextStats && selectedMonth && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider block">
                        Variación respecto a {currentMonthName}:
                      </span>
                      {renderVariationBadge('Contratos', nextStats.countDiff, nextStats.countPercent)}
                      {renderVariationBadge('Presupuesto', nextStats.valDiff, nextStats.valPercent, true)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 font-mono py-12">
                  <CalendarDays className="w-8 h-8 opacity-30 mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">No hay mes siguiente</span>
                  <span className="text-[9px] mt-1 text-slate-450">Diciembre es el fin del año fiscal</span>
                </div>
              )}
            </div>

          </div>

          {/* Activity Index & Narrative Conclusion */}
          {analysisResult && (
            <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Activity className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    Índice de Actividad Contractual en {currentMonthName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Ponderación del volumen de contratos y presupuesto comprometido frente al promedio anual de la entidad.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-3xs">
                  <span className="text-[11px] font-bold text-slate-400 font-mono uppercase">Nivel:</span>
                  <span className="text-xs font-extrabold font-mono uppercase px-2.5 py-0.5 rounded-full text-indigo-700 bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300">
                    {analysisResult.activityLabel} ({analysisResult.activityScore}/100)
                  </span>
                </div>
              </div>

              {/* Narrative Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                  <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 font-mono flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Conclusión del Mes
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Durante <strong>{currentMonthName}</strong> se firmaron <strong>{analysisResult.count} contratos</strong> por un valor total de <strong>{formatCOPInMillones(analysisResult.totalValue)}</strong>, con un promedio de <strong>{formatCOPInMillones(analysisResult.avgValue)} por contrato</strong>.
                    {prevStats && (
                      <span className="block mt-1">
                        Frente al mes anterior, la cantidad de contratos {prevStats.countDiff >= 0 ? `aumentó un ${prevStats.countPercent.toFixed(1)}%` : `disminuyó un ${Math.abs(prevStats.countPercent).toFixed(1)}%`} y el presupuesto {prevStats.valDiff >= 0 ? `aumentó un ${prevStats.valPercent.toFixed(1)}%` : `disminuyó un ${Math.abs(prevStats.valPercent).toFixed(1)}%`}.
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono flex items-center gap-1.5 uppercase">
                    <Scale className="w-3.5 h-3.5 text-slate-500" />
                    Interpretación Ciudadana
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {analysisResult.statusDescription}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* Contract Structural Distribution (Modalidades, Tipos y Sectores) */}
          {analysisResult && analysisResult.count > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Estructura de la Contratación en {currentMonthName}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Modalidad */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 space-y-2.5">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Modalidad Principal
                  </span>
                  {analysisResult.topModalities[0] ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[70%]" title={analysisResult.topModalities[0].name}>
                          {analysisResult.topModalities[0].name}
                        </span>
                        <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                          {analysisResult.topModalities[0].percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${analysisResult.topModalities[0].percent}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono block">No especificada</span>
                  )}
                </div>

                {/* Tipo */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 space-y-2.5">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Tipo de Contrato Principal
                  </span>
                  {analysisResult.topTypes[0] ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[70%]" title={analysisResult.topTypes[0].name}>
                          {analysisResult.topTypes[0].name}
                        </span>
                        <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {analysisResult.topTypes[0].percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${analysisResult.topTypes[0].percent}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono block">No especificado</span>
                  )}
                </div>

                {/* Sector */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 space-y-2.5">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Sector Principal
                  </span>
                  {analysisResult.topSectors[0] ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[70%]" title={analysisResult.topSectors[0].name}>
                          {analysisResult.topSectors[0].name}
                        </span>
                        <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-450">
                          {analysisResult.topSectors[0].percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${analysisResult.topSectors[0].percent}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-mono block">No especificado</span>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* Pedagogical Footer */}
      <div className="p-4 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-900/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-2">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-450 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">¿Cómo utilizar este análisis?</p>
            <p className="leading-relaxed text-[11px]">
              La comparación mensual permite a la ciudadanía identificar tendencias de incremento o desaceleración en el número de contratos y los montos comprometidos. Para consultar el detalle individual de cada contrato firmado, diríjase a la pestaña de <strong>Contratos</strong> en el menú principal.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
