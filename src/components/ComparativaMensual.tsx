import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ArrowRightLeft, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info,
  CalendarDays,
  Coins,
  FileText,
  Sparkles,
  Scale,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Users,
  PieChart,
  HelpCircle,
  ShieldAlert,
  Sliders,
  Clock,
  Briefcase
} from 'lucide-react';
import { formatCOP, formatCurrencyMillions } from '../utils/helpers';
import { Contrato } from '../types';
import { analyzeMonth, MonthlyAnalysisResult } from '../utils/monthlyAnalysis';

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
  selectedMonthKey,
  onSelectMonthKey
}: ComparativaMensualProps) {
  // Find the last month that has some contracting, to pre-select it (avoid selecting empty months)
  const defaultIndex = useMemo(() => {
    let lastWithData = 0;
    for (let i = 0; i < monthlyData.length; i++) {
      if (monthlyData[i]['Cantidad Contratos'] > 0) {
        lastWithData = i;
      }
    }
    return lastWithData;
  }, [monthlyData]);

  const [localSelectedIndex, setLocalSelectedIndex] = useState<number>(defaultIndex);

  const selectedIndex = useMemo(() => {
    if (selectedMonthKey && selectedMonthKey !== 'all') {
      const idx = monthlyData.findIndex(m => m.key === selectedMonthKey);
      if (idx !== -1) return idx;
    }
    return localSelectedIndex;
  }, [monthlyData, selectedMonthKey, localSelectedIndex]);

  // Sync selected index if default index changes (e.g., when switching entity)
  useEffect(() => {
    setLocalSelectedIndex(defaultIndex);
  }, [defaultIndex]);

  const setSelectedIndex = (index: number) => {
    setLocalSelectedIndex(index);
    if (onSelectMonthKey && monthlyData[index]) {
      onSelectMonthKey(monthlyData[index].key);
    }
  };

  const selectedMonth = monthlyData[selectedIndex];

  // Run deep statistical citizen analysis for the selected month
  const analysisResult = useMemo<MonthlyAnalysisResult | null>(() => {
    if (!selectedMonth || !contratos || contratos.length === 0) return null;
    return analyzeMonth(contratos, selectedMonth.key);
  }, [selectedMonth, contratos]);

  // Calculations for PREVIOUS Month (Basic comparison)
  const prevMonth = selectedIndex > 0 ? monthlyData[selectedIndex - 1] : null;
  const prevStats = useMemo(() => {
    if (!prevMonth || prevMonth['Cantidad Contratos'] === 0 || !selectedMonth || selectedMonth['Cantidad Contratos'] === 0) return null;
    const currentVal = selectedMonth['Valor Contratado'];
    const currentCount = selectedMonth['Cantidad Contratos'];
    const prevVal = prevMonth['Valor Contratado'];
    const prevCount = prevMonth['Cantidad Contratos'];

    const valDiff = currentVal - prevVal;
    const valPercent = prevVal > 0 ? (valDiff / prevVal) * 100 : currentVal > 0 ? 100 : 0;

    const countDiff = currentCount - prevCount;
    const countPercent = prevCount > 0 ? (countDiff / prevCount) * 100 : currentCount > 0 ? 100 : 0;

    return {
      valDiff,
      valPercent,
      countDiff,
      countPercent,
    };
  }, [selectedMonth, prevMonth]);

  // Calculations for NEXT Month (Basic comparison)
  const nextMonth = selectedIndex < monthlyData.length - 1 ? monthlyData[selectedIndex + 1] : null;
  const nextStats = useMemo(() => {
    if (!nextMonth || nextMonth['Cantidad Contratos'] === 0 || !selectedMonth || selectedMonth['Cantidad Contratos'] === 0) return null;
    const currentVal = selectedMonth['Valor Contratado'];
    const currentCount = selectedMonth['Cantidad Contratos'];
    const nextVal = nextMonth['Valor Contratado'];
    const nextCount = nextMonth['Cantidad Contratos'];

    const valDiff = nextVal - currentVal;
    const valPercent = currentVal > 0 ? (valDiff / currentVal) * 100 : nextVal > 0 ? 100 : 0;

    const countDiff = nextCount - currentCount;
    const countPercent = currentCount > 0 ? (countDiff / currentCount) * 100 : nextCount > 0 ? 100 : 0;

    return {
      valDiff,
      valPercent,
      countDiff,
      countPercent,
    };
  }, [selectedMonth, nextMonth]);

  const annualAvgValue = analysisResult?.avgValuePerMonth || 0;
  const annualAvgContracts = analysisResult?.avgContractsPerMonth || 0;

  const prevMonthRelationToAvg = useMemo(() => {
    if (!prevMonth) return null;
    const valPercent = annualAvgValue > 0 ? ((prevMonth['Valor Contratado'] - annualAvgValue) / annualAvgValue) * 100 : 0;
    const countPercent = annualAvgContracts > 0 ? ((prevMonth['Cantidad Contratos'] - annualAvgContracts) / annualAvgContracts) * 100 : 0;
    return { valPercent, countPercent };
  }, [prevMonth, annualAvgValue, annualAvgContracts]);

  const nextMonthRelationToAvg = useMemo(() => {
    if (!nextMonth) return null;
    const valPercent = annualAvgValue > 0 ? ((nextMonth['Valor Contratado'] - annualAvgValue) / annualAvgValue) * 100 : 0;
    const countPercent = annualAvgContracts > 0 ? ((nextMonth['Cantidad Contratos'] - annualAvgContracts) / annualAvgContracts) * 100 : 0;
    return { valPercent, countPercent };
  }, [nextMonth, annualAvgValue, annualAvgContracts]);

  const fullMonthNames: { [key: string]: string } = {
    'Ene': 'Enero', 'Feb': 'Febrero', 'Mar': 'Marzo', 'Abr': 'Abril',
    'May': 'Mayo', 'Jun': 'Junio', 'Jul': 'Julio', 'Ago': 'Agosto',
    'Sep': 'Septiembre', 'Oct': 'Octubre', 'Nov': 'Noviembre', 'Dic': 'Diciembre'
  };

  // Friendly formatter for currency in millions of COP (Colombian Spanish notation)
  const formatCOPInMillones = (cop: number): string => {
    return formatCurrencyMillions(cop);
  };

  if (!selectedMonth) return null;

  const currentMonthName = fullMonthNames[selectedMonth.name] || selectedMonth.name;

  // Render variables derived from the deep statistical analysis
  const hasAnalysis = analysisResult !== null && analysisResult.count > 0;

  // Format percent difference nicely with sign
  const formatDiffText = (diff: number) => {
    const formatted = Math.abs(diff).toFixed(1);
    return diff >= 0 ? `▲ ${formatted}% superior` : `▼ ${formatted}% inferior`;
  };

  // Status colors helper
  const getStatusColorClasses = (color: 'emerald' | 'amber' | 'rose') => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          border: 'border-emerald-200 dark:border-emerald-900/30',
          text: 'text-emerald-800 dark:text-emerald-300',
          indicator: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        };
      case 'amber':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-900/30',
          text: 'text-amber-800 dark:text-amber-300',
          indicator: 'bg-amber-500',
          icon: <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        };
      case 'rose':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/20',
          border: 'border-rose-200 dark:border-rose-900/30',
          text: 'text-rose-800 dark:text-rose-300',
          indicator: 'bg-rose-500',
          icon: <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        };
    }
  };

  const statusStyle = analysisResult ? getStatusColorClasses(analysisResult.statusColor) : null;

  // Activity score colors
  const getActivityColor = (level: string) => {
    if (level === 'muy-baja' || level === 'baja') return 'bg-amber-500';
    if (level === 'normal') return 'bg-indigo-600 dark:bg-indigo-500';
    return 'bg-rose-500';
  };

  const renderDiffMetric = (label: string, percent: number) => {
    const isPositive = percent >= 0;
    const formatted = Math.abs(percent).toFixed(1);
    const colorClass = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <div className="flex items-center justify-between text-[11px] font-medium py-1 border-b border-slate-100/55 dark:border-slate-800/40 last:border-0">
        <span className="text-slate-500 dark:text-slate-400">{label}:</span>
        <span className={`font-bold font-mono flex items-center gap-1 ${colorClass}`}>
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {isPositive ? '+' : ''}{formatted}%
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-8" id="comparativa-mensual-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Variación y Análisis de Contratación Mensual
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare la evolución directa e interprete el comportamiento contractual del mes seleccionado frente al promedio de la vigencia.
          </p>
        </div>

        {/* Month Selector Carousel/Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">
            Mes seleccionado:
          </span>
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-450 transition-all cursor-pointer shadow-2xs"
          >
            {monthlyData.map((m, idx) => (
              <option key={m.key} value={idx}>
                {fullMonthNames[m.name] || m.name} ({m['Cantidad Contratos'] > 0 ? `${m['Cantidad Contratos']} contratos` : 'sin datos'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Prev, Selected, Next */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. PREVIOUS MONTH CARD */}
        <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl p-5 flex flex-col justify-between min-h-[380px] relative overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
          {prevMonth ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Mes Anterior</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-850 dark:text-slate-200">
                  {fullMonthNames[prevMonth.name] || prevMonth.name}
                </h4>

                {prevMonth['Cantidad Contratos'] > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block font-medium">
                        💰 Valor total contratado
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block font-mono">
                        {formatCOP(prevMonth['Valor Contratado'])} COP
                      </span>
                      <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCOPInMillones(prevMonth['Valor Contratado'])}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block font-medium">
                        🟢 Contratos firmados
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {prevMonth['Cantidad Contratos']} {prevMonth['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block font-medium">
                        ⚖️ Valor promedio por contrato
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {formatCOPInMillones(prevMonth['Valor Contratado'] / prevMonth['Cantidad Contratos'])}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-center">
                    <span className="text-xs font-mono font-bold text-slate-500 block">Sin información disponible</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Mes aún no consolidado</span>
                  </div>
                )}
              </div>

              {prevMonth['Cantidad Contratos'] > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-850 text-xs space-y-3">
                  {/* vs Annual Avg */}
                  {prevMonthRelationToAvg && (
                    <div className="bg-white dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/40 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider block mb-1">
                        Frente al Promedio Anual:
                      </span>
                      {renderDiffMetric('Presupuesto', prevMonthRelationToAvg.valPercent)}
                      {renderDiffMetric('Contratación', prevMonthRelationToAvg.countPercent)}
                    </div>
                  )}

                  {/* progression to selected */}
                  {prevStats && selectedMonth['Cantidad Contratos'] > 0 && (
                    <div className="bg-indigo-50/30 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-900/30 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-indigo-650 dark:text-indigo-400 uppercase font-bold tracking-wider block mb-1">
                        Evolución hacia {currentMonthName}:
                      </span>
                      {renderDiffMetric('Variación Presupuesto', prevStats.valPercent)}
                      {renderDiffMetric('Variación Contratos', prevStats.countPercent)}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 font-mono py-12">
              <CalendarDays className="w-8 h-8 opacity-30 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">No hay mes previo</span>
              <span className="text-[9px] mt-1 text-slate-450">Enero es el inicio de la vigencia</span>
            </div>
          )}
        </div>

        {/* 2. SELECTED MONTH CARD (Base, Main Highlighted) */}
        <div className="bg-indigo-50/10 dark:bg-indigo-950/5 border-2 border-indigo-600 dark:border-indigo-500 rounded-2xl p-5 flex flex-col justify-between min-h-[380px] shadow-xs relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 dark:bg-indigo-500/20 blur-xl pointer-events-none rounded-full"></div>
          
          <div>
            <div className="flex items-center justify-between gap-1.5 border-b border-indigo-100/50 dark:border-indigo-900/30 pb-2">
              <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold">Mes seleccionado</span>
              </div>

              {/* Semáforo Ciudadano Badge */}
              {statusStyle && (
                <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold font-mono uppercase tracking-wider ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.indicator} animate-pulse`}></span>
                  {analysisResult?.statusLabel}
                </div>
              )}
            </div>

            <h4 className="text-xl font-black text-indigo-950 dark:text-white mt-2.5">
              {currentMonthName}
            </h4>

            {selectedMonth['Cantidad Contratos'] > 0 ? (
              <div className="mt-4 space-y-4">
                {/* Value block */}
                <div>
                  <span className="text-[10px] font-mono text-indigo-900/60 dark:text-indigo-400 block font-bold uppercase tracking-wider">
                    💰 Monto total reportado
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block font-mono">
                    {formatCOP(selectedMonth['Valor Contratado'])} COP
                  </span>
                  <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCOPInMillones(selectedMonth['Valor Contratado'])}
                  </span>
                </div>

                {/* Contracts block */}
                <div>
                  <span className="text-[10px] font-mono text-indigo-900/60 dark:text-indigo-400 block font-bold uppercase tracking-wider">
                    🟢 Contratos firmados
                  </span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-200 block leading-tight">
                    {selectedMonth['Cantidad Contratos']} {selectedMonth['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl border border-amber-200/30 dark:border-amber-900/20 text-center">
                <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300 block">Sin información disponible</span>
                <span className="text-[9px] text-amber-600 dark:text-amber-450 mt-0.5 block">Mes aún no consolidado</span>
              </div>
            )}
          </div>

          {selectedMonth['Cantidad Contratos'] > 0 && (
            <div className="mt-4 pt-4 border-t border-indigo-100/50 dark:border-indigo-900/30 text-xs space-y-3">
              {/* vs Annual Avg */}
              {analysisResult && (
                <div className="bg-white dark:bg-slate-900/40 border border-indigo-100/30 dark:border-indigo-900/30 p-2.5 rounded-xl">
                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider block mb-1">
                    Frente al Promedio Anual:
                  </span>
                  {renderDiffMetric('Desviación Presupuesto', analysisResult.valuePercentDiff)}
                  {renderDiffMetric('Desviación Contratos', analysisResult.countPercentDiff)}
                </div>
              )}

              {/* vs Prev Month */}
              {prevMonth && prevStats && (
                <div className="bg-indigo-50/30 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-900/30 p-2.5 rounded-xl">
                  <span className="text-[9px] font-mono text-indigo-650 dark:text-indigo-400 uppercase font-bold tracking-wider block mb-1">
                    Evolución desde {fullMonthNames[prevMonth.name] || prevMonth.name}:
                  </span>
                  {renderDiffMetric('Variación Presupuesto', prevStats.valPercent)}
                  {renderDiffMetric('Variación Contratos', prevStats.countPercent)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. NEXT MONTH CARD */}
        <div className="bg-slate-50/40 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl p-5 flex flex-col justify-between min-h-[380px] relative overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
          {nextMonth ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Mes Siguiente</span>
                </div>
                <h4 className="text-base font-extrabold text-slate-850 dark:text-slate-200">
                  {fullMonthNames[nextMonth.name] || nextMonth.name}
                </h4>

                {nextMonth['Cantidad Contratos'] > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block font-medium">
                        💰 Valor total contratado
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block font-mono">
                        {formatCOP(nextMonth['Valor Contratado'])} COP
                      </span>
                      <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCOPInMillones(nextMonth['Valor Contratado'])}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block font-medium">
                        🟢 Contratos firmados
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {nextMonth['Cantidad Contratos']} {nextMonth['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block font-medium">
                        ⚖️ Valor promedio por contrato
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                        {formatCOPInMillones(nextMonth['Valor Contratado'] / nextMonth['Cantidad Contratos'])}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-center">
                    <span className="text-xs font-mono font-bold text-slate-500 block">Sin información disponible</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Mes aún no consolidado</span>
                  </div>
                )}
              </div>

              {nextMonth['Cantidad Contratos'] > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-850 text-xs space-y-3">
                  {/* vs Annual Avg */}
                  {nextMonthRelationToAvg && (
                    <div className="bg-white dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/40 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider block mb-1">
                        Frente al Promedio Anual:
                      </span>
                      {renderDiffMetric('Presupuesto', nextMonthRelationToAvg.valPercent)}
                      {renderDiffMetric('Contratación', nextMonthRelationToAvg.countPercent)}
                    </div>
                  )}

                  {/* progression from selected */}
                  {nextStats && selectedMonth['Cantidad Contratos'] > 0 && (
                    <div className="bg-indigo-50/30 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-900/30 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-indigo-650 dark:text-indigo-400 uppercase font-bold tracking-wider block mb-1">
                        Evolución desde {currentMonthName}:
                      </span>
                      {renderDiffMetric('Variación Presupuesto', nextStats.valPercent)}
                      {renderDiffMetric('Variación Contratos', nextStats.countPercent)}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 font-mono py-12">
              <CalendarDays className="w-8 h-8 opacity-30 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">No hay mes siguiente</span>
              <span className="text-[9px] mt-1 text-slate-450">Diciembre es el fin de la vigencia</span>
            </div>
          )}
        </div>

      </div>

      {/* Citizen Index of Contract Activity (Punto 12, 13, 14, 17) */}
      {analysisResult && (
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                Índice de Actividad Contractual
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Indica el flujo de contratación del mes ponderando el presupuesto comprometido y el volumen de contratos frente al comportamiento histórico de la entidad.
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 px-3 py-1.5 rounded-xl shadow-3xs">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase">Nivel:</span>
              <span className={`text-xs font-extrabold font-mono uppercase px-2.5 py-0.5 rounded-full text-white ${getActivityColor(analysisResult.activityLevel)}`}>
                {analysisResult.activityLabel}
              </span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                {analysisResult.activityScore}/100
              </span>
            </div>
          </div>

          {/* Activity Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
              <div 
                className={`h-full rounded-full transition-all duration-550 ${getActivityColor(analysisResult.activityLevel)}`} 
                style={{ width: `${analysisResult.activityScore}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              <span>0% Muy baja</span>
              <span>25% Baja</span>
              <span>50% Media</span>
              <span>75% Alta</span>
              <span>100% Extrema</span>
            </div>
          </div>

          {/* Anomalies alert / narrative detailed summary of the status */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${statusStyle ? `${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}` : ''}`}>
            {statusStyle?.icon}
            <div className="space-y-1.5">
              <span className="font-extrabold block text-xs uppercase font-mono tracking-wider">
                Estado: {analysisResult.statusLabel}
              </span>
              <p className="font-medium opacity-90">
                {analysisResult.statusDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Control Indicators (Punto 6, 7, 11, 17) */}
      {hasAnalysis && analysisResult && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Indicadores de Control Ciudadano y Alertas de Concentración
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Concentration (Top Contracts) */}
            <div className="bg-slate-50/30 dark:bg-slate-950/10 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Concentración del Presupuesto</span>
                </div>
                
                <div className="space-y-2">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 block tracking-tight">
                    {analysisResult.top1Percent.toFixed(1)}%
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-455 leading-relaxed font-medium">
                    {analysisResult.top1Percent >= 60 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        ⚠️ Alerta: El mayor contrato captura más del 60% de los recursos totales de este mes.
                      </span>
                    ) : (
                      <span>El contrato más grande representa una proporción moderada del presupuesto mensual de contratación.</span>
                    )}
                  </p>
                </div>
              </div>

              {analysisResult.maxContract && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-3 rounded-xl text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  <span className="font-extrabold text-slate-850 dark:text-slate-200 block mb-1 uppercase text-[8px] tracking-wider font-mono">
                    Contrato Mayor:
                  </span>
                  <div className="max-h-[72px] overflow-y-auto pr-1 text-slate-600 dark:text-slate-400 scrollbar-thin">
                    {analysisResult.maxContract.objeto_del_contrato || 'Objeto no especificado'}
                  </div>
                </div>
              )}
            </div>

            {/* Provider Concentration (Top 3) */}
            <div className="bg-slate-50/30 dark:bg-slate-950/10 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-2">
                  <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Concentración por Contratista</span>
                </div>

                <div className="space-y-2">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 block tracking-tight">
                    {analysisResult.topProvidersPercent.toFixed(1)}%
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-455 leading-relaxed font-medium">
                    {analysisResult.topProvidersPercent >= 75 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        ⚠️ Concentración de proveedores alta. Los 3 contratistas principales acumulan las tres cuartas partes del presupuesto.
                      </span>
                    ) : (
                      <span>Los tres mayores contratistas presentan un nivel de participación balanceado sobre el gasto total del mes.</span>
                    )}
                  </p>
                </div>
              </div>

              {analysisResult.topProviders.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-2 rounded-xl text-[9px] font-semibold text-slate-500 dark:text-slate-400 space-y-1 mt-2">
                  {analysisResult.topProviders.slice(0, 2).map((p, i) => (
                    <div key={p.name} className="flex justify-between items-center gap-1 truncate">
                      <span className="truncate text-slate-700 dark:text-slate-300">#{i+1} {p.name}</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{p.percent.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeliness (Contracts counter-clock) */}
            <div className="bg-slate-50/30 dark:bg-slate-950/10 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-2">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Firma de Fin de Mes (Contrarreloj)</span>
                </div>

                <div className="space-y-2">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 block tracking-tight">
                    {analysisResult.last5DaysPercent.toFixed(1)}%
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-455 leading-relaxed font-medium">
                    {analysisResult.isLastWeekConcentrated ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        ⚠️ Ejecución contrarreloj: Más del 60% de los contratos del mes se firmaron en sus últimos 5 días.
                      </span>
                    ) : (
                      <span>La distribución temporal de firmas de contratos es regular y extendida de manera estable a lo largo del periodo.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-2.5 rounded-xl text-[9px] text-slate-500 dark:text-slate-400 flex justify-between items-center mt-2">
                <span>Firmas en últimos 5 días:</span>
                <span className="font-bold font-mono text-slate-700 dark:text-slate-200">{analysisResult.last5DaysCount} de {analysisResult.count}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Contract Structural Distribution (Puntos 8, 9, 10, 17) */}
      {hasAnalysis && analysisResult && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
            <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Estructura y Destino de los Recursos
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Modalidad */}
            <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl p-4.5 space-y-3">
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Modalidad de Contratación Mayoritaria
              </span>
              {analysisResult.topModalities[0] ? (
                <div className="space-y-2">
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
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    {analysisResult.primaryModalityLabel}
                  </p>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono block">No especificada</span>
              )}
            </div>

            {/* Tipo */}
            <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl p-4.5 space-y-3">
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Tipo de Contrato Principal
              </span>
              {analysisResult.topTypes[0] ? (
                <div className="space-y-2">
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
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    {analysisResult.primaryTypeLabel}
                  </p>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono block">No especificado</span>
              )}
            </div>

            {/* Sector */}
            <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl p-4.5 space-y-3">
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Orientación Sectorial Principal
              </span>
              {analysisResult.topSectors[0] ? (
                <div className="space-y-2">
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
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    {analysisResult.primarySectorLabel}
                  </p>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-mono block">No especificado</span>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Citizen Derived Indicators Block (Punto 17) */}
      {hasAnalysis && analysisResult && (
        <div className="bg-slate-50/20 dark:bg-slate-950/10 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-xl">
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-3">
            📋 Resumen Estadístico Mensual (Indicadores Derivados)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 p-2 rounded-lg">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Valor Promedio:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{formatCOPInMillones(analysisResult.avgValue)}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 p-2 rounded-lg">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Valor Mediano:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{formatCOPInMillones(analysisResult.medianValue)}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 p-2 rounded-lg">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Contrato Máximo:</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200" title={analysisResult.maxContract ? formatCOP(Number(analysisResult.maxContract.valor_del_contrato)) + ' COP' : ''}>
                {analysisResult.maxContract ? formatCOPInMillones(Number(analysisResult.maxContract.valor_del_contrato)) : 'N/A'}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 p-2 rounded-lg">
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Contrato Mínimo:</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200" title={analysisResult.minContract ? formatCOP(Number(analysisResult.minContract.valor_del_contrato)) + ' COP' : ''}>
                {analysisResult.minContract ? formatCOPInMillones(Number(analysisResult.minContract.valor_del_contrato)) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Summary Panel (Paso 15, 4, 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        
        {/* Dynamic Conclusion Paragraph (Conclusión del mes) */}
        <div className="bg-indigo-50/15 dark:bg-indigo-950/5 border border-indigo-100/60 dark:border-indigo-900/40 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Conclusión del mes
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {analysisResult && (
              <>
                Durante <strong>{currentMonthName}</strong> se consolidaron <strong>{analysisResult.count} contratos</strong> por un valor total de <strong>{formatCOPInMillones(analysisResult.totalValue)}</strong>. 
                {analysisResult.count > 0 ? (
                  <span>
                    {' '}Este comportamiento representa una variación del {analysisResult.countPercentDiff >= 0 ? `+${analysisResult.countPercentDiff.toFixed(1)}%` : `${analysisResult.countPercentDiff.toFixed(1)}%`} en cantidad de firmas y un {analysisResult.valuePercentDiff >= 0 ? `+${analysisResult.valuePercentDiff.toFixed(1)}%` : `${analysisResult.valuePercentDiff.toFixed(1)}%`} en el presupuesto total asignado en comparación con el promedio mensual consolidado de la vigencia ({formatCOPInMillones(analysisResult.avgValuePerMonth)} en promedio).
                    {analysisResult.hasHighConcentration && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold block mt-2">
                        ⚠️ Se detecta una alta concentración de recursos en un grupo reducido de contratos durante este periodo, representando un factor clave a monitorear por la ciudadanía.
                      </span>
                    )}
                  </span>
                ) : (
                  <span> Este periodo se muestra inactivo sin firmas contractuales ingresadas al sistema de contratación del SECOP II.</span>
                )}
              </>
            )}
          </p>
        </div>

        {/* Dynamic Interpretation Advice (¿Qué significa esto?) */}
        <div className="bg-slate-50/60 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            ¿Qué significa esto?
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {analysisResult && (
              <>
                {analysisResult.status === 'atípicamente-baja' && (
                  <span>
                    La inactividad o volumen extremadamente bajo en este mes suele deberse a demoras en la publicación del SECOP II por parte de la entidad, o la coincidencia con periodos de veda contractual legal. No necesariamente implica irregularidades, sino una menor intensidad en el compromiso formal de nuevos fondos públicos.
                  </span>
                )}
                {analysisResult.status === 'pico-extremo' && (
                  <span>
                    Se evidencia un comportamiento altamente concentrado e inusual de firmas financieras. Un pico de contratación de esta magnitud suele estar justificado por la adjudicación formal de licitaciones públicas de infraestructura, o compras de suministros de gran envergadura. Se aconseja revisar el contrato mayor de este periodo para constatar su objeto legal.
                  </span>
                )}
                {analysisResult.status === 'superior-promedio' && (
                  <span>
                    Existe un incremento de gasto público por encima de la media de la entidad. Esto sugiere una etapa de fuerte avance en la ejecución de programas de gobierno, o la contratación estacional de personal y servicios de apoyo técnico.
                  </span>
                )}
                {analysisResult.status === 'inferior-promedio' && (
                  <span>
                    El flujo de nuevos contratos y desembolsos estuvo moderadamente por debajo del promedio. Representa un periodo de transición ordinaria, donde los comités y oficinas de adquisiciones suelen estructurar los pliegos de condiciones de futuras licitaciones.
                  </span>
                )}
                {analysisResult.status === 'normal' && (
                  <span>
                    El volumen contractual y de recursos sigue un curso regular, lo que denota una ejecución programada y previsible de las metas institucionales de la entidad, sin picos ni anomalías presupuestales inusuales en este mes.
                  </span>
                )}
              </>
            )}
          </p>
        </div>

      </div>

      {/* Static Pedagogical Footer (¿Qué nos dicen estos datos?) */}
      <div className="p-4 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-900/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-2">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-450 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">¿Qué nos dicen estos datos?</p>
            <p className="leading-relaxed">
              Monitorear la variación de contratación mes a mes permite a los ciudadanos detectar comportamientos fuera de lo habitual que ameriten explicaciones oficiales por parte de los funcionarios de la entidad.
            </p>
          </div>
        </div>
        
        {analysisResult && analysisResult.possibleCauses.length > 0 && (
          <div className="pl-7 pt-1 space-y-1">
            <p className="font-semibold text-[11px] text-amber-700 dark:text-amber-400">Posibles explicaciones de la variación observada:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              {analysisResult.possibleCauses.map((cause, index) => (
                <li key={index}>{cause}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </div>
  );
}
