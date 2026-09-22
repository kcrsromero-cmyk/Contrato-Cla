import React, { useState, useMemo } from 'react';
import { Contrato } from '../../types';
import { useActividadTemporal, DiaActividad } from '../../hooks/useActividadTemporal';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyMillions, formatCOP, formatDate } from '../../utils/helpers';
import ContractDetailModal from '../ContractDetailModal';
import {
  BarChart2,
  CalendarDays,
  Flame,
  TrendingDown,
  TrendingUp,
  Activity,
  DollarSign,
  Lock,
  Star,
  ChevronRight,
  Info,
  X,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ActividadTemporalTabProps {
  contratos: Contrato[];
  allContratos?: Contrato[];
  fechaDesde: string;
  fechaHasta: string;
  monthlyData?: { key: string; name: string; 'Cantidad Contratos': number }[];
  selectedMonthKey?: string;
  onSelectMonthKey?: (key: string) => void;
}

type SubViewType = 'indice' | 'semana' | 'calendario' | 'dias-semana';
type FilterLevel = 'all' | 'pico' | 'alta' | 'regular' | 'valle';
type DiaSemanaFilter = 'all' | 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Dom, 1=Lun...6=Sáb

const NOMBRES_DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const NOMBRES_MES_COMPLETO: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const ActividadTemporalTab: React.FC<ActividadTemporalTabProps> = ({
  contratos,
  allContratos,
  fechaDesde,
  fechaHasta,
  monthlyData,
  selectedMonthKey,
  onSelectMonthKey,
}) => {
  const { plan } = useAuth();
  const isFreeOrStarter = plan === 'FREE' || plan === 'STARTER';

  const metricas = useActividadTemporal(contratos, fechaDesde, fechaHasta, allContratos);

  const [subView, setSubView] = useState<SubViewType>('indice');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [diaSemanaFilter, setDiaSemanaFilter] = useState<DiaSemanaFilter>('all');
  const [showPicoModal, setShowPicoModal] = useState(false);

  const [clickedDay, setClickedDay] = useState<DiaActividad | null>(null);
  const [clickedDayEstadoFilter, setClickedDayEstadoFilter] = useState<string>('all');
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);

  // ── Umbrales estadísticos ──────────────────────────────────────────────────
  const media = metricas.promedioDiario;
  const desviacion = useMemo(() => {
    if (metricas.porDia.length === 0) return 0;
    const sum = metricas.porDia.reduce((s, d) => s + Math.pow(d.contratos - media, 2), 0);
    return Math.sqrt(sum / metricas.porDia.length);
  }, [metricas.porDia, media]);
  const thresholdPico = media + desviacion;

  const getDayLevel = (d: DiaActividad): FilterLevel => {
    if (d.contratos === 0) return 'valle';
    if (d.contratos > thresholdPico) return 'pico';
    if (d.contratos > media) return 'alta';
    return 'regular';
  };

  // También clasifica como valle el día con el mínimo si es muy bajo
  const getDayLevelExtended = (d: DiaActividad): FilterLevel => {
    if (d.contratos === 0) return 'valle';
    if (d.contratos === metricas.minimoDiarioValor && metricas.minimoDiarioValor > 0 && d.contratos < media * 0.2) return 'valle';
    if (d.contratos > thresholdPico) return 'pico';
    if (d.contratos > media) return 'alta';
    return 'regular';
  };

  // ── Conteos por categoría para la leyenda ─────────────────────────────────
  const conteosPorNivel = useMemo(() => {
    const counts = { pico: 0, alta: 0, regular: 0, valle: 0 };
    const sumas = { pico: 0, alta: 0, regular: 0, valle: 0 };
    metricas.porDia.forEach(d => {
      const lvl = getDayLevelExtended(d);
      counts[lvl]++;
      sumas[lvl] += d.contratos;
    });
    return { counts, sumas };
  }, [metricas.porDia, thresholdPico, media, metricas.minimoDiarioValor]);

  // ── Conteos por día de semana ─────────────────────────────────────────────
  const conteosPorDiaSemana = useMemo(() => {
    const result: Record<number, { dias: number; firmas: number }> = {};
    for (let i = 0; i < 7; i++) result[i] = { dias: 0, firmas: 0 };
    metricas.porDia.forEach(d => {
      result[d.diaSemana].dias++;
      result[d.diaSemana].firmas += d.contratos;
    });
    return result;
  }, [metricas.porDia]);

  // ── Datos filtrados para el gráfico ────────────────────────────────────────
  const datosFiltrados = useMemo(() => {
    return metricas.porDia.filter(d => {
      const nivelOk = filterLevel === 'all' || getDayLevelExtended(d) === filterLevel;
      const diaOk = diaSemanaFilter === 'all' || d.diaSemana === diaSemanaFilter;
      return nivelOk && diaOk;
    });
  }, [metricas.porDia, filterLevel, diaSemanaFilter, thresholdPico, media, metricas.minimoDiarioValor]);

  // ── Contratos del día pico (para modal) ───────────────────────────────────
  const contratosPico = useMemo(() => {
    if (!metricas.maximoDiario.fecha) return [];
    return contratos.filter(c => c.fecha_de_firma?.startsWith(metricas.maximoDiario.fecha));
  }, [contratos, metricas.maximoDiario.fecha]);

  // Contratos del día seleccionado para el modal de detalle
  const contratosDelDia = useMemo(() => {
    if (!clickedDay) return [];
    return contratos.filter(c => c.fecha_de_firma?.startsWith(clickedDay.fecha));
  }, [contratos, clickedDay]);

  // Estados únicos de los contratos del día (para filtro)
  const estadosDelDia = useMemo(() => {
    const estados = new Set(contratosDelDia.map(c => c.estado_contrato || 'Sin estado'));
    return Array.from(estados).sort();
  }, [contratosDelDia]);

  // Contratos del día filtrados por estado
  const contratosDelDiaFiltrados = useMemo(() => {
    if (clickedDayEstadoFilter === 'all') return contratosDelDia;
    return contratosDelDia.filter(c => (c.estado_contrato || 'Sin estado') === clickedDayEstadoFilter);
  }, [contratosDelDia, clickedDayEstadoFilter]);

  // ── Formateo ───────────────────────────────────────────────────────────────
  const formatMillones = (v: number) => {
    const m = v / 1_000_000;
    return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(m)} millones`;
  };

  const labelMes = (key: string) => {
    if (!key || key === 'all') return 'Todos los meses (Vigencia)';
    const [, mm] = key.split('-');
    return NOMBRES_MES_COMPLETO[mm] || key;
  };

  const filtroLabel = selectedMonthKey && selectedMonthKey !== 'all'
    ? labelMes(selectedMonthKey)
    : 'Todos los meses (Vigencia)';

  const colorDia = (level: FilterLevel) => {
    switch (level) {
      case 'pico': return '#f97316';       // orange-500
      case 'alta': return '#4f46e5';       // indigo-600
      case 'regular': return '#818cf8';    // indigo-400
      case 'valle': return '#cbd5e1';      // slate-300
    }
  };

  // ─── Sub-tabs: bloqueados si FREE/STARTER ─────────────────────────────────
  const subTabs: { id: SubViewType; label: string; locked: boolean }[] = [
    { id: 'indice', label: 'Vista Mes', locked: false },
    { id: 'semana', label: 'Por Semana', locked: isFreeOrStarter },
    { id: 'calendario', label: 'Tipo Calendario', locked: isFreeOrStarter },
    { id: 'dias-semana', label: 'Días Semana', locked: isFreeOrStarter },
  ];

  // ─── KPIs compartidos (indice + dias-semana) ──────────────────────────────
  const renderKPIs = () => {
    const varM = metricas.variacionMensual;
    const varColor = varM ? (varM.porcentaje >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400') : '';
    const totalDias = metricas.totalDiasPeriodo;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* MÁXIMO DIARIO */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/40 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Máximo Diario</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {metricas.maximoDiario.contratos}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">contratos/día</div>
          {metricas.maximoDiario.dia > 0 && (
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Día {metricas.maximoDiario.dia} del mes
            </div>
          )}
          {metricas.maximoDiario.valor > 0 && (
            <div className="text-xs font-semibold text-orange-500 mt-1">
              {formatMillones(metricas.maximoDiario.valor)}
            </div>
          )}
        </div>

        {/* MÍNIMO DIARIO */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Mínimo Diario</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {metricas.minimoDiarioValor}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">contratos/día</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            En {metricas.minimoDiarioCount} {metricas.minimoDiarioCount === 1 ? 'día' : 'días'}
            {metricas.minimoDiarioFinDeSemanaCount > 0
              ? ` (${metricas.minimoDiarioFinDeSemanaCount} en fin de semana).`
              : ' (0 en fin de semana).'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Cota inferior de actividad.</div>
        </div>

        {/* PROMEDIO */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Promedio</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {metricas.promedioDiario}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">contratos/día</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Días activos: {metricas.promedioHabil}/día</div>
          <div className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">Días hábiles: {metricas.promedioHabil}/día</div>
        </div>

        {/* MEDIANA */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Mediana</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {metricas.medianaDiaria}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">contratos/día</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Punto medio del flujo diario.</div>
          <div className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">Libre de distorsiones por picos.</div>
        </div>

        {/* DÍAS ACTIVOS */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Días Activos</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {metricas.diasConFirmas}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">días con firmas</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {totalDias > 0 ? Math.round((metricas.diasConFirmas / totalDias) * 100) : 0}% del total de {totalDias} días del periodo.
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Jornadas con actividad efectiva.</div>
        </div>

        {/* DÍAS SIN CONTRATACIÓN */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarDays className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Días sin Contratación</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {metricas.diasEnCero}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">días en cero</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {totalDias > 0 ? Math.round((metricas.diasEnCero / totalDias) * 100) : 0}% del total de días del periodo.
          </div>
          <div className="text-xs font-semibold text-red-500 dark:text-red-400">Jornadas sin registro de firmas.</div>
        </div>

        {/* VALOR PROM./CONTRATO */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Valor Prom./Contrato</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1">
            {formatCurrencyMillions(metricas.valorPromedioPorContrato)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            $ {new Intl.NumberFormat('es-CO').format(Math.round(metricas.valorPromedioPorContrato))}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total {metricas.totalContratos} contratos firmados.</div>
        </div>

        {/* VARIACIÓN MENSUAL */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            {varM && varM.porcentaje >= 0
              ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            }
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Variación Mensual</span>
          </div>
          {varM ? (
            <>
              <div className={`text-3xl font-black leading-none ${varColor}`}>
                {varM.porcentaje >= 0 ? '+' : ''}{varM.porcentaje.toFixed(1)}%
              </div>
              <div className={`text-xs font-semibold mt-0.5 ${varColor}`}>
                {varM.diferencia >= 0 ? '+' : ''}{varM.diferencia} contratos
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                vs. {varM.mesActualLabel} vs {varM.mesAnteriorLabel}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 dark:text-slate-500 mt-2">Sin datos de mes anterior</div>
          )}
        </div>
      </div>
    );
  };

  // ─── Pico Banner ──────────────────────────────────────────────────────────
  const renderPicoBanner = () => {
    if (metricas.maximoDiario.contratos === 0) return null;
    return (
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl shrink-0">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 dark:text-orange-400 font-mono">
                Pico Máximo Registrado: {filtroLabel}
              </span>
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded-full border border-orange-200 dark:border-orange-800">
                {metricas.maximoDiario.contratos} contratos registrados en 1 día
              </span>
            </div>
            <p className="text-xs text-orange-800 dark:text-orange-300 mt-1 font-medium">
              El Día {metricas.maximoDiario.dia} del mes representó la mayor concentración de firmas acumuladas con{' '}
              <strong>{metricas.maximoDiario.contratos} contratos</strong> y un valor de{' '}
              <strong>{formatCOP(metricas.maximoDiario.valor)}</strong>.
            </p>
          </div>
        </div>
        {contratosPico.length > 0 && (
          <button
            onClick={() => setShowPicoModal(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm whitespace-nowrap"
          >
            VER {metricas.maximoDiario.contratos} CONTRATOS
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  // ─── Footer bar ───────────────────────────────────────────────────────────
  const renderFooterBar = () => {
    const diaMayor = metricas.porDiaSemana.reduce(
      (max, d) => d.contratos > max.contratos ? d : max,
      metricas.porDiaSemana[0] || { dia: '', contratos: 0, porcentaje: 0, valor: 0 }
    );
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            Día de la semana con mayor concentración:{' '}
            <strong className="text-slate-900 dark:text-white">{diaMayor.dia}</strong>
            {diaMayor.contratos > 0 && (
              <> ({diaMayor.contratos} contratos, {diaMayor.porcentaje.toFixed(1)}% del total del periodo)</>
            )}
          </span>
        </div>
        <div className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/40">
          Monto acumulado: {formatCurrencyMillions(metricas.totalValor)}
        </div>
      </div>
    );
  };

  // ─── Leyenda interactiva ──────────────────────────────────────────────────
  const renderLeyenda = () => {
    const cats: { id: FilterLevel; label: string; emoji: string; bg: string; activeBg: string }[] = [
      { id: 'all', label: 'TODAS', emoji: '📊', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', activeBg: 'bg-indigo-600 border-indigo-600 text-white' },
      { id: 'pico', label: 'PICO', emoji: '🔥', bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900', activeBg: 'bg-orange-500 border-orange-500 text-white' },
      { id: 'alta', label: 'ALTA (>MEDIA)', emoji: '↗', bg: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900', activeBg: 'bg-indigo-500 border-indigo-500 text-white' },
      { id: 'regular', label: 'REGULAR', emoji: '~', bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800', activeBg: 'bg-slate-500 border-slate-500 text-white' },
      { id: 'valle', label: 'VALLE / 0', emoji: '↘', bg: 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800', activeBg: 'bg-slate-400 border-slate-400 text-white' },
    ];

    const totalDias = metricas.porDia.length;
    const totalFirmas = metricas.totalContratos;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
              Leyenda Interactiva de Intensidad y Rangos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Haga clic en cualquier categoría para resaltar o filtrar los días en el calendario.
            </span>
            <button className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700">
              Guía Lectura Fácil
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {cats.map(cat => {
            const isActive = filterLevel === cat.id;
            const dias = cat.id === 'all' ? totalDias : conteosPorNivel.counts[cat.id as keyof typeof conteosPorNivel.counts] || 0;
            const firs = cat.id === 'all' ? totalFirmas : conteosPorNivel.sumas[cat.id as keyof typeof conteosPorNivel.sumas] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterLevel(cat.id)}
                className={`flex flex-col gap-0.5 p-2.5 rounded-xl border text-left transition-all min-w-[90px] ${isActive ? cat.activeBg : `${cat.bg} text-slate-700 dark:text-slate-300`}`}
              >
                <span className="flex items-center gap-1 text-[10px] font-extrabold font-mono uppercase">
                  <span>{cat.emoji}</span> {cat.label}
                  {isActive && <span className="ml-auto text-[9px] font-bold opacity-80 px-1 py-0.5 bg-white/20 rounded">ACTIVO</span>}
                </span>
                <span className="text-[11px] font-bold">{dias} días</span>
                <span className="text-[10px] opacity-80">{firs} fir.</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Filtro por día de semana ─────────────────────────────────────────────
  const renderFiltroDiaSemana = () => {
    const totalDias = metricas.porDia.length;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono mr-1">
          Filtrar día semana:
        </span>
        <button
          onClick={() => setDiaSemanaFilter('all')}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${diaSemanaFilter === 'all' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400'}`}
        >
          Todos ({totalDias})
        </button>
        {NOMBRES_DIA_CORTO.map((nombre, i) => {
          const count = conteosPorDiaSemana[i]?.firmas || 0;
          const isActive = diaSemanaFilter === i;
          const isWeekend = i === 0 || i === 6;
          return (
            <button
              key={i}
              onClick={() => setDiaSemanaFilter(i as DiaSemanaFilter)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : isWeekend
                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900 text-orange-600 dark:text-orange-400 hover:border-orange-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
              }`}
            >
              {nombre} ({count})
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Gráfico de barras ────────────────────────────────────────────────────
  const renderBarChart = () => {
    const datosGrafico = metricas.porDia
      .filter(d => diaSemanaFilter === 'all' || d.diaSemana === diaSemanaFilter)
      .map(d => ({
        dia: d.dia,
        contratos: d.contratos,
        level: getDayLevelExtended(d),
        nombre: `${d.nombreDia} ${d.dia}`,
      }));

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload?.length) {
        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-md text-xs">
            <p className="font-bold text-slate-900 dark:text-white mb-1">{payload[0]?.payload?.nombre}</p>
            <p className="text-slate-600 dark:text-slate-400">Contratos: <span className="font-bold text-slate-900 dark:text-white">{payload[0]?.value}</span></p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Distribución de firmas por día del mes ({filtroLabel})
          </span>
          <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" /> Día Pico</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-400 inline-block" /> Regular</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" /> Mínimo/Valle</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={datosGrafico} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              label={{ value: `Días del Mes (1 - ${datosGrafico.length} Acumulado Vigencia)`, position: 'insideBottom', offset: -2, fontSize: 9, fill: '#94a3b8' }}
            />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
            <ReferenceLine
              y={media}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: `Media: ${media}`, position: 'right', fontSize: 9, fill: '#94a3b8' }}
            />
            <Bar dataKey="contratos" radius={[3, 3, 0, 0]}>
              {datosGrafico.map((entry, index) => (
                <Cell key={index} fill={colorDia(entry.level as FilterLevel)} fillOpacity={filterLevel === 'all' || filterLevel === entry.level ? 1 : 0.25} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const handleDayClick = (dia: DiaActividad) => {
    if (dia.contratos === 0) return; // No abrir modal para días sin contratos
    setClickedDay(dia);
    setClickedDayEstadoFilter('all');
  };

  // ─── Modal Detalle del Día ────────────────────────────────────────────────
  const renderDiaDetalleModal = () => {
    if (!clickedDay) return null;

    const totalValorDia = contratosDelDia.reduce((s, c) => s + (Number(c.valor_del_contrato) || 0), 0);
    const nombreDiaCompleto = `${clickedDay.nombreDia}, ${formatDate(clickedDay.fecha)}`;

    const getStatusColor = (estado: string | undefined) => {
      const e = (estado || '').toLowerCase();
      if (e.includes('ejecuci')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      if (e.includes('liquidado')) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      if (e.includes('terminado') || e.includes('finalizado')) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      if (e.includes('aprobado')) return 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      if (e.includes('suspendido') || e.includes('cancelado')) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setClickedDay(null)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Cabecera */}
          <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl shrink-0">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Detalle de Firmas del Día: {nombreDiaCompleto}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Se firmaron{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">{clickedDay.contratos} contratos</strong>
                  {' '}por un valor total de{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">{formatCOP(totalValorDia)}</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setClickedDay(null)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filtro por estado */}
          {estadosDelDia.length > 1 && (
            <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                Filtrar por estado contractual:
              </span>
              <button
                onClick={() => setClickedDayEstadoFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  clickedDayEstadoFilter === 'all'
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                }`}
              >
                Todos ({contratosDelDia.length})
              </button>
              {estadosDelDia.map(estado => {
                const count = contratosDelDia.filter(c => (c.estado_contrato || 'Sin estado') === estado).length;
                return (
                  <button
                    key={estado}
                    onClick={() => setClickedDayEstadoFilter(estado)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      clickedDayEstadoFilter === estado
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                    }`}
                  >
                    {estado} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Lista de contratos */}
          <div className="overflow-y-auto flex-1 p-4 space-y-2.5">
            {contratosDelDiaFiltrados.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No hay contratos para este filtro</p>
            ) : (
              contratosDelDiaFiltrados.map((c, i) => (
                <div
                  key={c.id_contrato || i}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800"
                >
                  {/* Fila superior: índice + badges + fecha */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                        #{i + 1} de {contratosDelDiaFiltrados.length}
                      </span>
                      {c.id_contrato && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-mono font-bold rounded border border-slate-200 dark:border-slate-700">
                          ID: {c.id_contrato}
                        </span>
                      )}
                      {c.referencia_del_contrato && (
                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-mono font-bold rounded border border-indigo-100 dark:border-indigo-900">
                          Ref: {c.referencia_del_contrato}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                      Firma: {formatDate(c.fecha_de_firma)}
                    </span>
                  </div>

                  {/* Contratista y objeto */}
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                    {c.proveedor_adjudicado || 'Sin contratista'}
                  </p>
                  {(c.objeto_del_contrato || c.descripcion_del_proceso) && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-2">
                      {c.objeto_del_contrato || c.descripcion_del_proceso}
                    </p>
                  )}

                  {/* Fila inferior: valor + estado + links */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {formatCOP(Number(c.valor_del_contrato) || 0)}
                    </span>
                    <div className="flex items-center gap-2">
                      {c.estado_contrato && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getStatusColor(c.estado_contrato)}`}>
                          ● {c.estado_contrato}
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedContrato(c)}
                        className="px-2.5 py-1 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        Ver Detalle
                      </button>
                      {c.urlproceso && (
                        <a
                          href={c.urlproceso}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                          SECOP ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Modal Pico ───────────────────────────────────────────────────────────
  const renderPicoModal = () => {
    if (!showPicoModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPicoModal(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {metricas.maximoDiario.contratos} contratos — Día {metricas.maximoDiario.dia} del mes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Día pico de mayor concentración de firmas</p>
            </div>
            <button onClick={() => setShowPicoModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-5 space-y-2">
            {contratosPico.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No se encontraron contratos para esa fecha</p>
            ) : (
              contratosPico.map((c, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{c.proveedor_adjudicado || 'Sin proveedor'}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{c.objeto_del_contrato || c.descripcion_del_proceso || 'Sin descripción'}</p>
                    </div>
                    <div className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      {formatCurrencyMillions(Number(c.valor_del_contrato) || 0)}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedContrato(c)}
                      className="px-2.5 py-1 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      Ver Detalle
                    </button>
                    {c.urlproceso && (
                      <a
                        href={typeof c.urlproceso === 'object' ? (c.urlproceso as any).url : c.urlproceso}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                      >
                        SECOP ↗
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Vista: Por Semana ────────────────────────────────────────────────────
  const renderPorSemana = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          Desglose Semanal del Mes seleccionado ({filtroLabel})
        </span>
        <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
          Haga clic en un día dentro de la semana para inspeccionar sus contratos
        </span>
      </div>

      {metricas.porMes.map(mes => (
        <div key={mes.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide font-mono">{mes.label}</h4>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {mes.totalContratos} contratos ({formatCurrencyMillions(mes.totalValor)})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {mes.semanas.map(sem => (
              <div
                key={sem.numero}
                className={`p-4 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
                  sem.esPico
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {sem.esPico && (
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-orange-500 text-white text-[9px] font-extrabold rounded-bl-xl font-mono">
                    🔥 PICO SEMANAL
                  </div>
                )}

                <div className="mb-3">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">
                    SEMANA {sem.numero} ({sem.rangoLabel})
                  </span>
                </div>

                <div className="text-2xl font-black text-slate-900 dark:text-white">{sem.contratos}</div>
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrencyMillions(sem.valor)}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Promedio: {sem.promedioPorDia}/día</div>

                {sem.mayorDia && (
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono font-bold mb-1">Mayor día de la semana:</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{sem.mayorDia.nombre}</span>
                      <span className="text-xs font-extrabold text-orange-500">{sem.mayorDia.contratos} firm.</span>
                    </div>
                  </div>
                )}

                {/* Mini días de la semana */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono font-bold mb-1">Días de la semana:</div>
                  <div className="flex gap-1 flex-wrap">
                    {sem.dias.map(dia => {
                      const esMayor = sem.mayorDia?.dia === dia.dia;
                      const tieneActividad = dia.contratos > 0;
                      return (
                        <div
                          key={dia.fecha}
                          title={`${dia.nombreDia} ${dia.dia}: ${dia.contratos} contratos`}
                          onClick={() => handleDayClick(dia)}
                          className={`flex flex-col items-center p-1 rounded-md text-center transition-colors min-w-[22px] ${
                            tieneActividad ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            esMayor && tieneActividad
                              ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700'
                              : tieneActividad
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                                : 'bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">
                            {dia.nombreDia.substring(0, 1)}
                          </span>
                          <span className={`text-[9px] font-black mt-0.5 ${tieneActividad ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-300 dark:text-slate-600'}`}>
                            {dia.dia}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Vista: Tipo Calendario ───────────────────────────────────────────────
  const renderCalendario = () => {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Matriz de Calendario Diario ({filtroLabel})
          </span>
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
            Haga clic en cualquier casilla para inspeccionar la fecha
          </span>
        </div>

        {metricas.porMes.map(mes => (
          <div key={mes.key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide font-mono">{mes.label}</h4>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {mes.totalContratos} contratos ({formatCurrencyMillions(mes.totalValor)})
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Cabeceras días de semana */}
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {diasSemana.map((d, i) => (
                    <div key={d} className={`text-center text-[10px] font-bold py-1 ${i === 0 || i === 6 ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Grid días */}
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Celdas vacías al inicio */}
                  {mes.dias.length > 0 && Array.from({ length: mes.dias[0].diaSemana }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-dashed border-slate-100 dark:border-slate-800" />
                  ))}

                  {/* Días del mes */}
                  {mes.dias.map(dia => {
                    const isWeekend = dia.esFinDeSemana;
                    const tieneActividad = dia.contratos > 0;
                    return (
                      <div
                        key={dia.fecha}
                        title={`${dia.nombreDia} ${dia.dia}: ${dia.contratos} contratos — ${formatCOP(dia.valor)}`}
                        onClick={() => handleDayClick(dia)}
                        className={`h-16 p-2 rounded-xl border flex flex-col transition-all ${
                          tieneActividad
                            ? 'cursor-pointer hover:shadow-md hover:border-indigo-400 hover:ring-1 hover:ring-indigo-200 dark:hover:ring-indigo-900'
                            : 'cursor-default'
                        } ${
                          isWeekend && !tieneActividad
                            ? 'bg-orange-50/30 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30'
                            : !tieneActividad
                              ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-bold ${isWeekend ? 'text-orange-500' : 'text-slate-700 dark:text-slate-300'}`}>{dia.dia}</span>
                        </div>
                        {tieneActividad ? (
                          <div className="mt-auto">
                            <div className="text-xs font-black text-slate-900 dark:text-white">{dia.contratos} firm.</div>
                            <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                              {formatCurrencyMillions(dia.valor)}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-auto text-[9px] text-slate-300 dark:text-slate-700">0 firm.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Vista: Días Semana ───────────────────────────────────────────────────
  const renderDiasSemana = () => (
    <div className="space-y-6">
      {renderPicoBanner()}
      {renderKPIs()}
      {renderFooterBar()}

      <div>
        <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">
          Distribución agregada de contratación por día de la semana (Lunes a Domingo)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {metricas.porDiaSemana.map((dia, idx) => {
            const isMayor = dia.dia === metricas.mesConMayorConcentracion;
            const isWeekend = idx === 0 || idx === 6;
            return (
              <div
                key={dia.dia}
                className={`p-4 rounded-2xl border shadow-sm flex flex-col relative overflow-hidden ${
                  isMayor
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                    : isWeekend
                      ? 'bg-orange-50/30 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {isMayor && (
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-bl-lg">MAYOR</div>
                )}
                <h4 className={`text-xs font-extrabold mb-2 uppercase ${isWeekend ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}>
                  {dia.dia}
                </h4>
                <div className={`text-3xl font-black ${isMayor ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                  {dia.contratos}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">{dia.porcentaje.toFixed(1)}% del total</div>
                <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-1">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Promedio: {metricas.totalDiasPeriodo > 0 ? (dia.contratos / Math.ceil(metricas.totalDiasPeriodo / 7)).toFixed(1) : 0}/día
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate" title={formatCOP(dia.valor)}>
                    {formatCurrencyMillions(dia.valor)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ─── Gate para plan FREE/STARTER ─────────────────────────────────────────
  const renderPremiumGate = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-5">
        <Star className="w-8 h-8 text-amber-400" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Funcionalidad exclusiva para suscriptores</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
        Las vistas detalladas de Calendario, Semanas y Días de Semana están disponibles desde el plan Profesional.
      </p>
      <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all">
        Ver planes
      </button>
    </div>
  );

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {renderPicoModal()}
      {renderDiaDetalleModal()}
      <ContractDetailModal
        contract={selectedContrato}
        onClose={() => setSelectedContrato(null)}
      />

      {/* ── Cabecera con título + sub-tabs + SINCRONIZAR MES ── */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Índice de Actividad Contractual Diaria</h3>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Indicadores estadísticos clave del ritmo de contratación: máximo diario, mínimo, promedio, mediana, días activos, días sin firmas, valor promedio por contrato y variación mensual en SECOP II.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          {/* SINCRONIZAR MES */}
          {monthlyData && onSelectMonthKey && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                Sincronizar mes:
              </span>
              <select
                value={selectedMonthKey || 'all'}
                onChange={e => onSelectMonthKey(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">📅 Todos los meses (Vigencia)</option>
                {monthlyData.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.name} ({m['Cantidad Contratos']} contratos)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 gap-0.5 overflow-x-auto">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => !tab.locked && setSubView(tab.id)}
                title={tab.locked ? 'Disponible en plan Profesional' : ''}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  subView === tab.id
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : tab.locked
                      ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                }`}
              >
                {tab.label}
                {tab.locked && <Lock className="w-2.5 h-2.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenido por sub-vista ── */}

      {/* Vista: Índice de Actividad */}
      {subView === 'indice' && (
        <div className="space-y-4">
          {renderPicoBanner()}
          {renderKPIs()}
          {renderFooterBar()}
          {renderLeyenda()}
          {renderFiltroDiaSemana()}
          {renderBarChart()}
        </div>
      )}

      {/* Vistas premium: gate si no tiene plan */}
      {isFreeOrStarter && subView !== 'indice' && renderPremiumGate()}

      {/* Vista: Por Semana */}
      {!isFreeOrStarter && subView === 'semana' && renderPorSemana()}

      {/* Vista: Tipo Calendario */}
      {!isFreeOrStarter && subView === 'calendario' && renderCalendario()}

      {/* Vista: Días Semana */}
      {!isFreeOrStarter && subView === 'dias-semana' && renderDiasSemana()}
    </div>
  );
};
