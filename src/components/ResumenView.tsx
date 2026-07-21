import React, { useMemo } from 'react';
import { Contrato } from '../types';
import { formatCOP, formatNumber, normalizeName, formatCurrencyMillions } from '../utils/helpers';
import { 
  Briefcase, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Users, 
  ShieldAlert, 
  Activity,
  FileSpreadsheet,
  CalendarCheck,
  ArrowRight,
  Handshake,
  ShieldCheck,
  Scale,
  Zap,
  Award,
  BadgeDollarSign,
  FileText,
  Info
} from 'lucide-react';

// Custom reusable tooltip component
function InfoTooltip({ content }: { content: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <span 
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      className="relative inline-block ml-1.5 align-middle cursor-help text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-20"
    >
      <Info className="w-3.5 h-3.5" />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-slate-950 dark:bg-slate-850 text-white dark:text-slate-100 text-[11px] leading-relaxed rounded-xl shadow-xl border border-slate-800 dark:border-slate-750 pointer-events-none text-left font-normal normal-case whitespace-normal z-30">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950 dark:border-t-slate-800"></span>
        </span>
      )}
    </span>
  );
}

// Map Colombian contracting modalities to distinct Lucide icons, emojis, and thematic color palettes
const getModalityVisuals = (name: string) => {
  const norm = name.toLowerCase();
  if (norm.includes('directa')) {
    return {
      icon: <Handshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      emoji: "🤝",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
      accentBorder: "hover:border-emerald-500 hover:shadow-emerald-50/50"
    };
  }
  if (norm.includes('abreviada')) {
    return {
      icon: <Zap className="w-4 h-4 text-amber-600 dark:text-amber-450" />,
      emoji: "⚡",
      bgClass: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-400",
      accentBorder: "hover:border-amber-500 hover:shadow-amber-50/50"
    };
  }
  if (norm.includes('cuantía') || norm.includes('cuantia')) {
    return {
      icon: <BadgeDollarSign className="w-4 h-4 text-teal-600 dark:text-teal-450" />,
      emoji: "💰",
      bgClass: "bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40 text-teal-700 dark:text-teal-400",
      accentBorder: "hover:border-teal-500 hover:shadow-teal-50/50"
    };
  }
  if (norm.includes('licitación') || norm.includes('licitacion')) {
    return {
      icon: <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      emoji: "🏛️",
      bgClass: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-400",
      accentBorder: "hover:border-blue-500 hover:shadow-blue-50/50"
    };
  }
  if (norm.includes('especial')) {
    return {
      icon: <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      emoji: "🛡️",
      bgClass: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-400",
      accentBorder: "hover:border-purple-500 hover:shadow-purple-50/50"
    };
  }
  if (norm.includes('méritos') || norm.includes('meritos') || norm.includes('concurso')) {
    return {
      icon: <Award className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      emoji: "🏆",
      bgClass: "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400",
      accentBorder: "hover:border-rose-500 hover:shadow-rose-50/50"
    };
  }
  return {
    icon: <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
    emoji: "📄",
    bgClass: "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-400",
    accentBorder: "hover:border-indigo-400 hover:shadow-indigo-50/50"
  };
};
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

import { useMetricas } from '../hooks/useMetricas';

interface ResumenViewProps {
  contratos: Contrato[];
  onModalityClick?: (modality: string) => void;
}

export default function ResumenView({ contratos, onModalityClick }: ResumenViewProps) {
  const {
    stats,
    monthlyData,
    statusData,
    modalityData,
  } = useMetricas(contratos);

  // Modern Swiss Theme Color Palette
  const COLORS = ['#1a1a1a', '#444440', '#777772', '#a0a09a', '#cbcbca', '#e4e4e1'];

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-md text-xs font-mono">
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">{label}</p>
          <p className="text-slate-500 dark:text-slate-400">
            Monto: <span className="font-semibold text-slate-900 dark:text-slate-200">{formatCOP(payload[0].value)}</span>
          </p>
          {payload[1] && (
            <p className="text-slate-500 dark:text-slate-400">
              Contratos: <span className="font-semibold text-slate-900 dark:text-slate-200">{formatNumber(payload[1].value)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in" id="resumen-dashboard">
      
      {/* Advertencia metodológica principal */}
      <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
        <div className="space-y-1.5">
          <span className="font-bold text-slate-800 dark:text-slate-300 block text-xs uppercase font-mono tracking-wider">Nota metodológica y de consulta ciudadana</span>
          <p className="leading-relaxed">
            La información presentada proviene del conjunto de Datos Abiertos de SECOP II — Contratos Electrónicos. Los resultados, conteos y valores se calculan a partir de la información contractual disponible y reportada por las entidades en ese conjunto de datos.
          </p>
          <p className="leading-relaxed">
            Esta aplicación organiza y presenta la información para facilitar su consulta, comparación y seguimiento ciudadano. Los indicadores son descriptivos y no constituyen prueba de irregularidades, incumplimientos, responsabilidades ni conclusiones jurídicas.
          </p>
          <p className="leading-relaxed font-semibold text-slate-700 dark:text-slate-300">
            Para ampliar o verificar la información, consulte el expediente, los documentos y las actualizaciones disponibles en los enlaces oficiales de SECOP incluidos en cada contrato.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contratos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-mono uppercase tracking-widest font-bold">
              Contratos Registrados
              <InfoTooltip content="Total de registros únicos de contratos cargados y procesados de SECOP II para la entidad en este rango de fechas." />
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatNumber(stats.totalContratos)}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Registros únicos deduplicados</p>
          </div>
        </div>

        {/* Valor Total Contratado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-mono uppercase tracking-widest font-bold">
              Monto Contratado
              <InfoTooltip content="Suma acumulada del valor de los contratos firmados (Cuantía del contrato). Refleja el presupuesto total comprometido." />
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              {formatCOP(stats.valorContratado)} COP
            </h4>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrencyMillions(stats.valorContratado)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Suma del valor de contratos firmados</p>
          </div>
        </div>

        {/* Valor Pagado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-mono uppercase tracking-widest font-bold">
              Monto Pagado
              <InfoTooltip content="Monto acumulado que la entidad reporta haber pagado a los contratistas (desembolsos o avances financieros)." />
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              {formatCOP(stats.valorPagado)} COP
            </h4>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrencyMillions(stats.valorPagado)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Registrado por tesorería o desembolsos</p>
          </div>
        </div>

        {/* Valor Pendiente de Ejecución */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-md transition-all duration-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-mono uppercase tracking-widest font-bold">
              Monto por Ejecutar
              <InfoTooltip content="Saldo financiero del contrato pendiente de entrega física (bienes, obras o servicios) de acuerdo al avance reportado." />
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-455 border border-amber-100 dark:border-amber-900/40 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
              {formatCOP(stats.valorPendienteEjecucion)} COP
            </h4>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-500 mt-1">{formatCurrencyMillions(stats.valorPendienteEjecucion)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Monto restante por cumplir contractualmente</p>
          </div>
        </div>
      </div>

      {/* Secondary Aggregated Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cantidad Supervisores */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-xs">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500">
              Supervisores Públicos
              <InfoTooltip content="Funcionarios o interventores designados por la entidad para certificar el cumplimiento de obligaciones del contrato." />
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(stats.totalSupervisores)}</div>
          </div>
        </div>

        {/* Cantidad Contratistas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-xs">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500">
              Contratistas Adjudicados
              <InfoTooltip content="Personas jurídicas, naturales, consorcios o firmas que han ganado y suscrito contratos en este periodo." />
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(stats.totalContratistas)}</div>
          </div>
        </div>

        {/* Valor pendiente de pago */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 shadow-xs">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-455 rounded-lg border border-amber-100 dark:border-amber-900/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500">
              Pendiente de Pago
              <InfoTooltip content="Monto contractual acumulado facturado o devengado que se encuentra en trámite o pendiente de abono de tesorería." />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {formatCOP(stats.valorPendientePago)}
            </div>
            <span className="block text-xs font-semibold text-amber-600 dark:text-amber-500 leading-none mt-1">
              {formatCurrencyMillions(stats.valorPendientePago)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly signature trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:col-span-2 flex flex-col h-[350px] shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider">
              Evolución Mensual de Contratación
              <InfoTooltip content="Curva temporal de los valores acumulados contratados según la fecha oficial de firma del contrato." />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Monto acumulado de los contratos firmados en cada mes de la vigencia.</p>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#888" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => `$${(val / 1e6).toFixed(0)}M`} 
                />
                <Tooltip content={customTooltip} />
                <Area 
                  type="monotone" 
                  dataKey="Valor Contratado" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contract Statuses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col h-[350px] shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider">
              Distribución por Estado
              <InfoTooltip content="El estado administrativo y operativo actual en el que se encuentra reportado el contrato en SECOP II." />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Estados de ejecución reportados en SECOP II.</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-mono">
              Sin datos de estados para este periodo
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {statusData.map((item, idx) => {
                const total = statusData.reduce((acc, curr) => acc + curr.value, 0);
                const percent = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#222] dark:text-slate-200 truncate max-w-[70%]" title={item.name}>
                        {item.name}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        {item.value} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* Modality breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider">
            Modalidades de Contratación Principales
            <InfoTooltip content="Diferentes procedimientos legales que facultan a la entidad a seleccionar la propuesta más idónea (Licitación, Contratación Directa, etc.)." />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Distribución por cantidad de contratos en las principales modalidades empleadas por la entidad.</p>
        </div>
        
        {modalityData.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            Sin datos de modalidades de contratación en este periodo
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modalityData.map((item, idx) => {
              const total = modalityData.reduce((acc, curr) => acc + curr.value, 0);
              const percent = ((item.value / total) * 100).toFixed(1);
              const visuals = getModalityVisuals(item.name);
              return (
                <div
                  key={item.name}
                  onClick={() => onModalityClick?.(item.name)}
                  className={`p-4 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all bg-slate-50/50 dark:bg-slate-950/40 shadow-2xs group flex flex-col justify-between min-h-[170px] ${
                    onModalityClick 
                      ? `cursor-pointer hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:-translate-y-0.5 ${visuals.accentBorder}` 
                      : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 shrink-0 ${visuals.bgClass}`}>
                          {visuals.icon}
                          <span className="text-xs leading-none select-none">{visuals.emoji}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">Modalidad #{idx + 1}</span>
                      </div>
                      {onModalityClick && (
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                          Ver <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-3 line-clamp-2" title={item.name}>
                      {item.name}
                    </div>
                  </div>
                  
                  <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-slate-100/60 dark:border-slate-800">
                    <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{formatNumber(item.value)}</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold uppercase">{percent}% del total</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
