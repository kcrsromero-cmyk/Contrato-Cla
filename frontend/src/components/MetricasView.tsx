import React, { useState, useMemo } from 'react';
import { Contrato } from '../types';
import { 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  BadgeAlert, 
  CopyCheck, 
  Sparkles,
  Calendar,
  Activity
} from 'lucide-react';

import { 
  ContractorAggregate, 
  MultiContractorAggregate, 
  RepeatedObjectGroup, 
  SimilarObjectGroup, 
} from './metricas/types';
import { FinanzasYTiposTab } from './metricas/FinanzasYTiposTab';
import { CruceDePlazosTab } from './metricas/CruceDePlazosTab';
import { ObjetosIdenticosTab } from './metricas/ObjetosIdenticosTab';
import { SimilitudLexicaTab } from './metricas/SimilitudLexicaTab';
import { AlertasYPlazosTab } from './metricas/AlertasYPlazosTab';
import { 
  TopContractorModal, 
  MultiContractorAuditModal, 
  RepeatedGroupModal, 
  SimilarGroupModal, 
  IndicatorListModal 
} from './metricas/Modals';

import { useMetricas } from '../hooks/useMetricas';
import { useContratistas } from '../hooks/useContratistas';
import { ComparativaMensual } from './ComparativaMensual';
import { ActividadTemporalTab } from './metricas/ActividadTemporalTab';

interface MetricasViewProps {
  contratos: Contrato[];
  fechaDesde: string;
  fechaHasta: string;
}

export default function MetricasView({ contratos, fechaDesde, fechaHasta }: MetricasViewProps) {
  const [selectedIndicatorList, setSelectedIndicatorList] = useState<{ label: string, list: Contrato[] } | null>(null);
  const [selectedMultiContractor, setSelectedMultiContractor] = useState<MultiContractorAggregate | null>(null);
  const [selectedRepeatedGroup, setSelectedRepeatedGroup] = useState<RepeatedObjectGroup | null>(null);
  const [selectedSimilarGroup, setSelectedSimilarGroup] = useState<SimilarObjectGroup | null>(null);
  const [selectedTopContractor, setSelectedTopContractor] = useState<ContractorAggregate | null>(null);
  const [chartType, setChartType] = useState<'donut' | 'bar-horizontal' | 'bar-vertical'>('donut');
  const [activeMainTab, setActiveMainTab] = useState<'general' | 'simultaneidad' | 'exactas' | 'similares' | 'alertas' | 'mensual' | 'temporal'>('general');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('all');

  const fullMonthNames: { [key: string]: string } = {
    'Ene': 'Enero', 'Feb': 'Febrero', 'Mar': 'Marzo', 'Abr': 'Abril',
    'May': 'Mayo', 'Jun': 'Junio', 'Jul': 'Julio', 'Ago': 'Agosto',
    'Sep': 'Septiembre', 'Oct': 'Octubre', 'Nov': 'Noviembre', 'Dic': 'Diciembre'
  };

  // Get full monthly data (always un-filtered so the comparison trends and selectors work correctly)
  const { monthlyData } = useMetricas(contratos, fechaDesde, fechaHasta);

  // Filter contracts for individual detailed indicator tabs
  const filteredContratos = useMemo(() => {
    if (selectedMonthKey === 'all') return contratos;
    return contratos.filter(c => {
      if (!c.fecha_de_firma) return false;
      const match = c.fecha_de_firma.match(/^\d{4}-(\d{2})-\d{2}/);
      return match && match[1] === selectedMonthKey;
    });
  }, [contratos, selectedMonthKey]);

  const {
    typeData,
    repeatedObjects,
    similarObjectsGroups,
    similarityLimited,
    similarityTotalCount,
    similarityPreviewCount,
    citizenIndicators,
    isCalculatingSimilar,
  } = useMetricas(filteredContratos, fechaDesde, fechaHasta);

  const {
    limiteContratistas,
    setLimiteContratistas,
    allSortedContractors,
    topContractors,
    multiContractors,
  } = useContratistas(filteredContratos);

  return (
    <div className="space-y-8 animate-fade-in" id="metricas-section">
      
      {/* Advertencia metodológica obligatoria */}
      <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-450 mt-0.5" />
        <div className="space-y-1.5">
          <span className="font-bold text-amber-900 dark:text-amber-200 block text-xs uppercase font-mono tracking-wider">Metodología de los indicadores ciudadanos</span>
          <p className="leading-relaxed">
            Los indicadores de esta aplicación se generan mediante conteos, sumas, agrupaciones y comparaciones de fechas o valores reportados en los registros públicos de SECOP II. Su propósito es facilitar la exploración, comparación y consulta de información contractual.
          </p>
          <p className="leading-relaxed">
            Los resultados son descriptivos: reflejan las reglas de cálculo aplicadas a los datos disponibles en la fecha de consulta. No representan dictámenes de ilegalidad, incumplimiento, responsabilidad administrativa, fiscal, disciplinaria o penal.
          </p>
          <p className="leading-relaxed font-semibold text-amber-955 dark:text-amber-100">
            Para interpretar cada caso, consulte el expediente oficial y los documentos asociados al proceso —por ejemplo, estudios previos, contrato, modificaciones, actas, informes y demás soportes disponibles en SECOP—.
          </p>
        </div>
      </div>

      {/* Lente de Análisis Temporal */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-150 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            Lente de Análisis Temporal
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[650px]">
            {selectedMonthKey === 'all' 
              ? 'Todos los análisis a continuación reflejan la vigencia completa. Seleccione un mes aquí o en la pestaña de Contratación Mensual para acoplar y filtrar todas las pestañas por ese periodo.'
              : `Filtrando todas las pestañas (Finanzas, Plazos, Objetos, Similitud, Alertas) para ver únicamente la actividad del mes de ${fullMonthNames[monthlyData.find(m => m.key === selectedMonthKey)?.name || ''] || 'Seleccionado'}.`
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Filtrar Mes:
          </span>
          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-450 transition-all cursor-pointer shadow-3xs"
          >
            <option value="all">📅 Todos los meses (Vigencia Completa)</option>
            {monthlyData.map(m => (
              <option key={m.key} value={m.key}>
                {fullMonthNames[m.name] || m.name} ({m['Cantidad Contratos']} {m['Cantidad Contratos'] === 1 ? 'contrato' : 'contratos'})
              </option>
            ))}
          </select>

          {selectedMonthKey !== 'all' && (
            <button
              onClick={() => setSelectedMonthKey('all')}
              className="text-[10px] font-bold font-mono px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              Ver Todo
            </button>
          )}
        </div>
      </div>

      {/* Nivel de Análisis Ciudadano por Pestañas */}
      <div className="space-y-4">
        <div className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span>Seleccione el nivel de detalle o análisis ciudadano:</span>
          <span className="h-1 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full"></span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Tab 1: General (Finanzas y Tipos) */}
          <button
            onClick={() => setActiveMainTab('general')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-3xs ${
              activeMainTab === 'general'
                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-600/10 dark:bg-indigo-950/25 dark:border-indigo-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <TrendingUp className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMainTab === 'general' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                activeMainTab === 'general' ? 'bg-indigo-100/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {allSortedContractors.length}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs block font-sans tracking-tight">Finanzas y Tipos</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight font-medium">Montos y tipologías</span>
            </div>
          </button>

          {/* Tab 2: Contratación Mensual */}
          <button
            onClick={() => setActiveMainTab('mensual')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-3xs ${
              activeMainTab === 'mensual'
                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-600/10 dark:bg-indigo-950/25 dark:border-indigo-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <Calendar className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMainTab === 'mensual' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                activeMainTab === 'mensual' ? 'bg-indigo-100/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {monthlyData.length}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs block font-sans tracking-tight">Contratación Mensual</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight font-medium">Variación y análisis</span>
            </div>
          </button>

          {/* Tab 2.5: Actividad Temporal */}
          <button
            onClick={() => setActiveMainTab('temporal')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-3xs ${
              activeMainTab === 'temporal'
                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-600/10 dark:bg-indigo-950/25 dark:border-indigo-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <Activity className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMainTab === 'temporal' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                activeMainTab === 'temporal' ? 'bg-indigo-100/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                ~
              </span>
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs block font-sans tracking-tight">Actividad Temporal</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight font-medium">Análisis de firmas</span>
            </div>
          </button>

          {/* Tab 3: Simultaneidad */}
          <button
            onClick={() => setActiveMainTab('simultaneidad')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-3xs ${
              activeMainTab === 'simultaneidad'
                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-600/10 dark:bg-indigo-950/25 dark:border-indigo-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <Users className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMainTab === 'simultaneidad' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                activeMainTab === 'simultaneidad' ? 'bg-indigo-100/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {multiContractors.length}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs block font-sans tracking-tight">Cruce de Plazos</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight font-medium">Control simultáneo</span>
            </div>
          </button>

          {/* Tab 4: Objetos Idénticos */}
          <button
            onClick={() => setActiveMainTab('exactas')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-3xs ${
              activeMainTab === 'exactas'
                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-600/10 dark:bg-indigo-950/25 dark:border-indigo-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <CopyCheck className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMainTab === 'exactas' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                activeMainTab === 'exactas' ? 'bg-indigo-100/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {repeatedObjects.length}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs block font-sans tracking-tight">Objetos Idénticos</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight font-medium">Recurrencia de objetos</span>
            </div>
          </button>

          {/* Tab 5: Similitud Léxica */}
          <button
            onClick={() => setActiveMainTab('similares')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-3xs ${
              activeMainTab === 'similares'
                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-600/10 dark:bg-indigo-950/25 dark:border-indigo-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <Sparkles className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMainTab === 'similares' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                activeMainTab === 'similares' ? 'bg-indigo-100/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {similarObjectsGroups.length}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs block font-sans tracking-tight">Similitud Léxica</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight font-medium">Diferencias de redacción</span>
            </div>
          </button>

          {/* Tab 6: Alertas */}
          <button
            onClick={() => setActiveMainTab('alertas')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group shadow-3xs ${
              activeMainTab === 'alertas'
                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-600/10 dark:bg-indigo-950/25 dark:border-indigo-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <BadgeAlert className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeMainTab === 'alertas' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                activeMainTab === 'alertas' ? 'bg-indigo-100/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {citizenIndicators.reduce((acc, i) => acc + i.count, 0)}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-extrabold text-xs block font-sans tracking-tight">Alertas y Plazos</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block leading-tight font-medium">Plazos, adiciones y saldos</span>
            </div>
          </button>
        </div>
      </div>

      {/* Contenido Dinámico de la Pestaña Activa */}
      <div className="transition-all duration-300">
        {activeMainTab === 'general' && (
          <FinanzasYTiposTab 
            topContractors={topContractors}
            typeData={typeData}
            limiteContratistas={limiteContratistas}
            setLimiteContratistas={setLimiteContratistas}
            chartType={chartType}
            setChartType={setChartType}
            setSelectedTopContractor={setSelectedTopContractor}
            allContractorsCount={allSortedContractors.length}
          />
        )}

        {activeMainTab === 'mensual' && (
          <ComparativaMensual 
            monthlyData={monthlyData} 
            contratos={contratos} 
            selectedMonthKey={selectedMonthKey}
            onSelectMonthKey={setSelectedMonthKey}
          />
        )}

        {activeMainTab === 'temporal' && (
          <ActividadTemporalTab
            contratos={filteredContratos}
            fechaDesde={selectedMonthKey !== 'all'
              ? `${selectedMonthKey}-01`
              : fechaDesde}
            fechaHasta={selectedMonthKey !== 'all'
              ? `${selectedMonthKey}-${new Date(
                  parseInt(selectedMonthKey.split('-')[0]),
                  parseInt(selectedMonthKey.split('-')[1]),
                  0
                ).getDate()}`
              : fechaHasta}
          />
        )}

        {activeMainTab === 'simultaneidad' && (
          <CruceDePlazosTab 
            multiContractors={multiContractors}
            setSelectedMultiContractor={setSelectedMultiContractor}
          />
        )}

        {activeMainTab === 'exactas' && (
          <ObjetosIdenticosTab 
            repeatedObjects={repeatedObjects}
            setSelectedRepeatedGroup={setSelectedRepeatedGroup}
          />
        )}

        {activeMainTab === 'similares' && (
          <SimilitudLexicaTab 
            similarObjectsGroups={similarObjectsGroups}
            setSelectedSimilarGroup={setSelectedSimilarGroup}
            isCalculatingSimilar={isCalculatingSimilar}
            isLimited={similarityLimited}
            totalCount={similarityTotalCount}
            previewCount={similarityPreviewCount}
          />
        )}

        {activeMainTab === 'alertas' && (
          <AlertasYPlazosTab 
            citizenIndicators={citizenIndicators}
            setSelectedIndicatorList={setSelectedIndicatorList}
          />
        )}
      </div>

      {/* Modals Container */}
      <TopContractorModal 
        selectedTopContractor={selectedTopContractor}
        onClose={() => setSelectedTopContractor(null)}
      />

      <MultiContractorAuditModal 
        selectedMultiContractor={selectedMultiContractor}
        onClose={() => setSelectedMultiContractor(null)}
      />

      <RepeatedGroupModal 
        selectedRepeatedGroup={selectedRepeatedGroup}
        onClose={() => setSelectedRepeatedGroup(null)}
      />

      <SimilarGroupModal 
        selectedSimilarGroup={selectedSimilarGroup}
        onClose={() => setSelectedSimilarGroup(null)}
      />

      <IndicatorListModal 
        selectedIndicatorList={selectedIndicatorList}
        onClose={() => setSelectedIndicatorList(null)}
      />

    </div>
  );
}
