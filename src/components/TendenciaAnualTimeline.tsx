import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Award, 
  Activity,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Coins
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Dot
} from 'recharts';
import { formatCOP, formatCurrencyMillions, formatNumber } from '../utils/helpers';
import { InfoTooltip } from './InfoTooltip';

const FULL_MONTH_NAMES: Record<string, string> = {
  Ene: 'Enero',
  Feb: 'Febrero',
  Mar: 'Marzo',
  Abr: 'Abril',
  May: 'Mayo',
  Jun: 'Junio',
  Jul: 'Julio',
  Ago: 'Agosto',
  Sep: 'Septiembre',
  Oct: 'Octubre',
  Nov: 'Noviembre',
  Dic: 'Diciembre'
};

interface TendenciaAnualTimelineProps {
  monthlyData: Array<{
    key: string;
    name: string;
    'Valor Contratado': number;
    'Cantidad Contratos': number;
  }>;
  totalAnnualValue: number;
  statusData?: Array<{ name: string; value: number }>;
}

export default function TendenciaAnualTimeline({ 
  monthlyData, 
  totalAnnualValue,
  statusData
}: TendenciaAnualTimelineProps) {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Calculate timeline analytics
  const analytics = useMemo(() => {
    let peakMonth = monthlyData[0] || { name: 'Ene', 'Valor Contratado': 0, 'Cantidad Contratos': 0 };
    let totalContracts = 0;
    let activeMonthsCount = 0;

    monthlyData.forEach(m => {
      const val = m['Valor Contratado'] || 0;
      totalContracts += m['Cantidad Contratos'] || 0;
      if (val > 0 || m['Cantidad Contratos'] > 0) activeMonthsCount += 1;
      if (val > (peakMonth['Valor Contratado'] || 0)) {
        peakMonth = m;
      }
    });

    const monthlyAverage = totalAnnualValue / 12;

    return {
      peakMonth,
      peakMonthFullName: FULL_MONTH_NAMES[peakMonth.name] || peakMonth.name,
      totalContracts,
      activeMonthsCount,
      monthlyAverage
    };
  }, [monthlyData, totalAnnualValue]);

  // Selected month detail
  const activeMonthData = useMemo(() => {
    if (!selectedMonthKey) return null;
    return monthlyData.find(m => m.key === selectedMonthKey) || null;
  }, [selectedMonthKey, monthlyData]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value || 0;
      const count = payload[0].payload['Cantidad Contratos'] || 0;
      const pct = totalAnnualValue > 0 ? ((val / totalAnnualValue) * 100).toFixed(1) : '0';
      const fullMonth = FULL_MONTH_NAMES[label] || label;

      return (
        <div className="bg-slate-950 text-white border-2 border-indigo-500/80 p-3.5 rounded-2xl shadow-xl text-xs font-mono space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <p className="font-bold text-slate-100 text-sm">{fullMonth}</p>
            <span className="text-[10px] bg-indigo-900/60 text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-700/50">
              {pct}% del año
            </span>
          </div>
          <p className="text-slate-300 flex justify-between gap-4 pt-1">
            <span>Monto Contratado:</span>
            <strong className="text-emerald-400 font-extrabold">{formatCurrencyMillions(val)}</strong>
          </p>
          <p className="text-slate-300 flex justify-between gap-4">
            <span>Valor Exacto:</span>
            <span className="text-slate-100 font-bold">{formatCOP(val)} COP</span>
          </p>
          <p className="text-slate-300 flex justify-between gap-4">
            <span>Contratos Firmados:</span>
            <strong className="text-indigo-300 font-extrabold">{formatNumber(count)} firmados</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in" id="tendencia-anual-timeline">
      
      {/* Header & Title Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight flex items-center gap-2">
                Línea Temporal de Comportamiento Presupuestal Anual (12 Meses)
                <InfoTooltip 
                  content="Evolución mes a mes del presupuesto contractual comprometido en la vigencia seleccionada según la fecha oficial de firma en SECOP II." 
                  calculation="Suma de cuantía contractual de los contratos firmados en cada uno de los 12 meses (Enero a Diciembre)."
                />
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Visualización histórica continua para el análisis ciudadano del ritmo de contratación y picos de ejecución contractual.
              </p>
            </div>
          </div>
        </div>

        {/* Top Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Presupuesto Total Anual */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">Ejecutado Anual</span>
              <span className="text-xs font-black font-mono text-slate-900 dark:text-slate-100">{formatCurrencyMillions(totalAnnualValue)}</span>
            </div>
          </div>

          {/* Mes Pico */}
          <div className="px-3 py-2 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold block">Mes de Mayor Ejecución</span>
              <span className="text-xs font-bold font-mono text-amber-900 dark:text-amber-200">
                {analytics.peakMonthFullName} ({formatCurrencyMillions(analytics.peakMonth['Valor Contratado'])})
              </span>
            </div>
          </div>

          {/* Promedio Mensual */}
          <div className="px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-bold block">Promedio Mensual</span>
              <span className="text-xs font-bold font-mono text-indigo-900 dark:text-indigo-200">
                {formatCurrencyMillions(analytics.monthlyAverage)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Area Chart Timeline */}
      <div className="h-[280px] sm:h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 15, right: 15, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="annualTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
            <XAxis 
              dataKey="name" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              className="dark:stroke-slate-700 font-mono font-bold"
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${(val / 1e6).toFixed(0)}M`} 
              className="font-mono"
            />
            <Tooltip content={customTooltip} />
            <Area 
              type="monotone" 
              dataKey="Valor Contratado" 
              stroke="#4f46e5" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#annualTrendGradient)" 
              dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7, fill: '#f59e0b', strokeWidth: 3, stroke: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive 12-Month Timeline Nodes Strip */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Selección mensual interactiva (Haz clic en un mes para inspeccionar detalles):
          </span>
          {selectedMonthKey && (
            <button
              onClick={() => setSelectedMonthKey(null)}
              className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-bold"
            >
              Limpiar selección
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-2">
          {monthlyData.map((m) => {
            const val = m['Valor Contratado'] || 0;
            const cnt = m['Cantidad Contratos'] || 0;
            const isPeak = m.key === analytics.peakMonth.key && val > 0;
            const isSelected = selectedMonthKey === m.key;
            const pct = totalAnnualValue > 0 ? ((val / totalAnnualValue) * 100).toFixed(1) : '0';

            return (
              <button
                key={m.key}
                onClick={() => setSelectedMonthKey(isSelected ? null : m.key)}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 ring-2 ring-indigo-500/40 shadow-sm'
                    : isPeak
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                {isPeak && (
                  <span className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-black text-[8px] px-1.5 py-0.2 rounded-bl-md uppercase font-mono tracking-wider">
                    Pico
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                      {m.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
                      {cnt} contr.
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{pct}% año</span>
                  <ArrowUpRight className={`w-3 h-3 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Panel for Selected Month */}
      {activeMonthData && (
        <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl font-mono font-black text-sm shrink-0">
              {activeMonthData.name}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                Detalle Presupuestal de {FULL_MONTH_NAMES[activeMonthData.name] || activeMonthData.name}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Se celebraron <strong className="text-slate-900 dark:text-slate-100">{activeMonthData['Cantidad Contratos']} contratos</strong> por un valor total de <strong className="text-slate-900 dark:text-slate-100">{formatCOP(activeMonthData['Valor Contratado'])} COP</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Participación Anual</span>
              <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                {totalAnnualValue > 0 ? ((activeMonthData['Valor Contratado'] / totalAnnualValue) * 100).toFixed(2) : '0'}%
              </span>
            </div>
            <button
              onClick={() => setSelectedMonthKey(null)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-indigo-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Distribución por Estado de Ejecución (Compacta e integrada debajo del gráfico) */}
      {statusData && statusData.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Distribución por Estado de Ejecución:
              </span>
              <InfoTooltip content="El estado administrativo y operativo actual en el que se encuentra reportado el contrato en SECOP II." />
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">
              Total: {statusData.reduce((acc, curr) => acc + curr.value, 0)} contratos
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {statusData.map((item) => {
              const total = statusData.reduce((acc, curr) => acc + curr.value, 0);
              const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={item.name} className="p-2.5 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[70%]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                      {item.value}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 text-right font-bold">
                    {percent}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
