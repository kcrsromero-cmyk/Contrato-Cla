import React, { useState, useMemo } from 'react';
import { Contrato } from '../../types';
import { useActividadTemporal, DiaActividad } from '../../hooks/useActividadTemporal';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart2 as Activity,
  CalendarDays,
  BarChart4,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
  Clock,
  Lock,
  Star
} from 'lucide-react';

interface ActividadTemporalTabProps {
  contratos: Contrato[];
  fechaDesde: string;
  fechaHasta: string;
}

type SubViewType = 'indice' | 'semana' | 'calendario' | 'dias-semana';
type FilterLevel = 'all' | 'pico' | 'alta' | 'regular' | 'valle';

export const ActividadTemporalTab: React.FC<ActividadTemporalTabProps> = ({ contratos, fechaDesde, fechaHasta }) => {
  const { plan } = useAuth();
  const isFreeOrStarter = plan === 'FREE' || plan === 'STARTER';

  const metricas = useActividadTemporal(contratos, fechaDesde, fechaHasta);
  const [subView, setSubView] = useState<SubViewType>('indice');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value);
  };

  const media = metricas.promedioDiario;

  // Calculate standard deviation for threshold
  const desviacion = useMemo(() => {
    if (metricas.porDia.length === 0) return 0;
    const sum = metricas.porDia.reduce((s, d) => s + Math.pow(d.contratos - media, 2), 0);
    return Math.sqrt(sum / metricas.porDia.length);
  }, [metricas.porDia, media]);

  const thresholdAlto = media;
  const thresholdPico = media + desviacion;

  const getDayLevel = (d: DiaActividad): FilterLevel => {
    if (d.contratos === 0) return 'valle';
    if (d.contratos > thresholdPico) return 'pico';
    if (d.contratos > thresholdAlto) return 'alta';
    return 'regular';
  };

  const getDayColor = (level: FilterLevel) => {
    switch (level) {
      case 'pico': return 'bg-orange-500 border-orange-600 text-white';
      case 'alta': return 'bg-indigo-500 border-indigo-600 text-white';
      case 'regular': return 'bg-indigo-200 border-indigo-300 text-indigo-900';
      case 'valle': return 'bg-white border-slate-200 text-slate-400';
      default: return 'bg-white border-slate-200 text-slate-400';
    }
  };

  const filteredDias = useMemo(() => {
    if (filterLevel === 'all') return metricas.porDia;
    return metricas.porDia.filter(d => getDayLevel(d) === filterLevel);
  }, [metricas.porDia, filterLevel, thresholdPico, thresholdAlto]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Sub-view Selector */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-full sm:w-auto overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setSubView('indice')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              subView === 'indice'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Índice de Actividad
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 self-center hidden sm:block"></div>

          <button
            onClick={() => !isFreeOrStarter && setSubView('semana')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              subView === 'semana'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : isFreeOrStarter
                  ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
            title={isFreeOrStarter ? 'Disponible en plan Profesional' : ''}
          >
            Por Semana
            {isFreeOrStarter && <Lock className="w-3 h-3" />}
          </button>

          <button
            onClick={() => !isFreeOrStarter && setSubView('calendario')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              subView === 'calendario'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : isFreeOrStarter
                  ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
            title={isFreeOrStarter ? 'Disponible en plan Profesional' : ''}
          >
            Tipo Calendario
            {isFreeOrStarter && <Lock className="w-3 h-3" />}
          </button>

          <button
            onClick={() => !isFreeOrStarter && setSubView('dias-semana')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              subView === 'dias-semana'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : isFreeOrStarter
                  ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
            title={isFreeOrStarter ? 'Disponible en plan Profesional' : ''}
          >
            Días Semana
            {isFreeOrStarter && <Lock className="w-3 h-3" />}
          </button>
        </div>

        {/* Interactive Legend */}
        <div className="flex gap-2 text-[10px] sm:text-xs font-bold overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${filterLevel === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            TODAS
          </button>
          <button
            onClick={() => setFilterLevel('pico')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${filterLevel === 'pico' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <span>🔥</span> PICO
          </button>
          <button
            onClick={() => setFilterLevel('alta')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${filterLevel === 'alta' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <span>↗</span> ALTA {`>`}MEDIA
          </button>
          <button
            onClick={() => setFilterLevel('regular')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${filterLevel === 'regular' ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <span>~</span> REGULAR
          </button>
          <button
            onClick={() => setFilterLevel('valle')}
            className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${filterLevel === 'valle' ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <span>-</span> VALLE / 0
          </button>
        </div>
      </div>

      {isFreeOrStarter && subView !== 'indice' && (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-5">
            <Star className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Funcionalidad exclusiva para suscriptores
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Las vistas detalladas de Calendario, Semanas y Días de Semana están disponibles desde el plan Profesional.
          </p>
          <button
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all"
          >
            Ver planes
          </button>
        </div>
      )}

      {/* Sub-view 1: Índice de Actividad */}
      {subView === 'indice' && (
        <div className="space-y-6">
          {/* Pico Máximo Banner */}
          {metricas.maximoDiario.contratos > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <TrendingUp className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                    PICO MÁXIMO DEL MES
                  </span>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <h3 className="text-4xl font-black">{metricas.maximoDiario.contratos}</h3>
                    <p className="text-orange-100 text-sm font-medium">contratos firmados</p>
                  </div>
                  <div className="pb-1">
                    <p className="text-lg font-bold">Día {metricas.maximoDiario.dia}</p>
                    <p className="text-orange-100 text-sm">Valor: {formatCurrency(metricas.maximoDiario.valor)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs font-bold">Total Días Rango</span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {metricas.totalDiasPeriodo}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold">Días con Firmas</span>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {metricas.diasConFirmas}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {Math.round((metricas.diasConFirmas / metricas.totalDiasPeriodo) * 100)}% del periodo
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <BarChart4 className="w-4 h-4" />
                <span className="text-xs font-bold">Promedio Diario</span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {metricas.promedioDiario}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                contratos por día
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold">Días en Valle (0)</span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {metricas.diasEnCero}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                sin actividad
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-bold">Mediana Diaria</span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {metricas.medianaDiaria}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold">Firmas Fin de Semana</span>
              </div>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-500">
                {metricas.firmasFinDeSemana.reduce((sum, d) => sum + d.contratos, 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                en {metricas.firmasFinDeSemana.length} días
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs font-bold">Día Mayor Concentración (General)</span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {metricas.mesConMayorConcentracion || 'N/A'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                día de la semana más frecuente
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 2: Por Semana */}
      {!isFreeOrStarter && subView === 'semana' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricas.porSemana.map((semana, index) => {
            const hasMatches = semana.dias.some(f => filteredDias.find(fd => fd.fecha === f));
            if (filterLevel !== 'all' && !hasMatches) return null;

            return (
              <div
                key={semana.semana}
                className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
                  semana.esPico
                    ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {semana.esPico && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-bl-xl">
                    PICO SEMANAL
                  </div>
                )}

                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">
                  Semana {semana.semana}
                </h4>

                <div className="mb-4">
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {semana.contratos}
                  </div>
                  <div className="text-xs text-slate-500">
                    contratos en {semana.dias.length} días
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Valor total:</span>
                    <span className="font-bold">{formatCurrency(semana.valor)}</span>
                  </div>
                  {semana.mayorDia && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Día mayor:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {semana.mayorDia.nombre} ({semana.mayorDia.contratos})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Promedio/día:</span>
                    <span className="font-bold">
                      {Math.round((semana.contratos / semana.dias.length) * 10) / 10}
                    </span>
                  </div>
                </div>

                {/* Días de la semana mini */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[9px] uppercase tracking-wide text-slate-400 mb-2 font-bold">
                    Días de la semana:
                  </p>
                  <div className="flex gap-1">
                    {semana.dias.map(fecha => {
                      const diaData = metricas.porDia.find(d => d.fecha === fecha);
                      if (!diaData) return null;
                      const esMayorDia = semana.mayorDia?.nombre.includes(diaData.nombreDia.substring(0,3));
                      return (
                        <div
                          key={fecha}
                          className={`flex-1 flex flex-col items-center p-1 rounded-lg text-center ${
                            esMayorDia && diaData.contratos > 0
                              ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700'
                              : diaData.contratos > 0
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800'
                              : 'bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">
                            {diaData.nombreDia.substring(0, 1)}
                          </span>
                          <span className={`text-[9px] font-bold mt-0.5 ${
                            diaData.contratos > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'
                          }`}>
                            {diaData.dia}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-view 3: Tipo Calendario */}
      {!isFreeOrStarter && subView === 'calendario' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day, i) => (
                <div key={day} className={`text-center text-xs font-bold py-2 ${i === 0 || i === 6 ? 'text-orange-500' : 'text-slate-500'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Pad empty days at start */}
              {metricas.porDia.length > 0 && Array.from({ length: metricas.porDia[0].diaSemana }).map((_, i) => (
                <div key={`empty-start-${i}`} className="h-24 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-dashed border-slate-200 dark:border-slate-800"></div>
              ))}

              {/* Days */}
              {metricas.porDia.map((dia) => {
                const isVisible = filterLevel === 'all' || getDayLevel(dia) === filterLevel;
                const level = getDayLevel(dia);
                const isWeekend = dia.esFinDeSemana;

                return (
                  <div
                    key={dia.fecha}
                    className={`h-24 p-2 rounded-xl border flex flex-col transition-all ${
                      !isVisible ? 'opacity-20 grayscale' : ''
                    } ${
                      isWeekend && level === 'valle'
                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                        : level === 'valle'
                          ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80'
                          : `${getDayColor(level)}`
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold ${level !== 'valle' && level !== 'regular' ? 'text-white' : 'text-slate-400'}`}>
                        {dia.dia}
                      </span>
                      {level === 'pico' && <span className="text-white text-[10px]">🔥</span>}
                    </div>

                    {dia.contratos > 0 && (
                      <div className="mt-auto">
                        <div className={`text-lg font-black leading-none ${level !== 'valle' && level !== 'regular' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          {dia.contratos}
                        </div>
                        <div className={`text-[9px] truncate mt-1 ${level !== 'valle' && level !== 'regular' ? 'text-white/80' : 'text-slate-500'}`}>
                          {formatCurrency(dia.valor)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 4: Días Semana */}
      {!isFreeOrStarter && subView === 'dias-semana' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {metricas.porDiaSemana.map((dia, index) => {
            const isMayor = metricas.mesConMayorConcentracion === dia.dia;
            // Map index (0-6) to weekend check
            const isWeekend = index === 0 || index === 6;

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
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-bold rounded-bl-lg">
                    MAYOR
                  </div>
                )}

                <h4 className={`text-xs font-bold mb-3 ${isWeekend ? 'text-orange-500' : 'text-slate-500'}`}>
                  {dia.dia}
                </h4>

                <div className="mb-3">
                  <div className={`text-2xl font-black ${isMayor ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                    {dia.contratos}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    contratos totales
                  </div>
                </div>

                <div className="mt-auto space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Distribución</span>
                      <span className="font-bold">{dia.porcentaje.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${isMayor ? 'bg-indigo-500' : 'bg-slate-400'}`}
                        style={{ width: `${dia.porcentaje}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate" title={formatCurrency(dia.valor)}>
                    {formatCurrency(dia.valor)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
