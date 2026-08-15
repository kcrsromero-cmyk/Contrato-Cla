import React from 'react';
import { 
  Calendar, 
  RefreshCw, 
  Sliders, 
  Compass, 
  LayoutDashboard, 
  FileText, 
  Users2, 
  BarChart4, 
  ArrowLeft, 
  ArrowRight, 
  Home 
} from 'lucide-react';
import { EntidadResumen, Contrato } from '../types';
import { DashboardTab, TABS_LIST } from '../hooks/useDashboard';
import { formatBytes } from '../utils/helpers';

// Subcomponents
import PeriodSelector from './PeriodSelector';
import ParallaxHero from './ParallaxHero';
import DashboardSkeleton from './DashboardSkeleton';
import ResumenView from './ResumenView';
import ContratosView from './ContratosView';
import SupervisoresView from './SupervisoresView';
import MetricasView from './MetricasView';
import TerminosDeUso from './TerminosDeUso';

interface DashboardProps {
  selectedEntity: EntidadResumen;
  contratos: Contrato[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  loadContracts: (forceRefresh?: boolean) => Promise<void>;
  
  // Period states
  fechaDesde: string;
  fechaHasta: string;
  periodLabel: string;
  isPeriodCollapsed: boolean;
  setIsPeriodCollapsed: (val: boolean) => void;
  handlePeriodChange: (desde: string, hasta: string, label: string) => void;

  // Dashboard states
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  selectedModalidadFilter: string;
  setSelectedModalidadFilter: (modality: string) => void;
  prevTab: typeof TABS_LIST[0] | null;
  nextTab: typeof TABS_LIST[0] | null;
  navigateToTab: (tabId: DashboardTab) => void;
  
  // Entity callbacks
  handleClearEntity: () => Promise<void>;
  isWideLayout?: boolean;
  dbSize?: number;
}

export default function Dashboard({
  selectedEntity,
  contratos,
  loading,
  error,
  lastUpdated,
  loadContracts,
  
  fechaDesde,
  fechaHasta,
  periodLabel,
  isPeriodCollapsed,
  setIsPeriodCollapsed,
  handlePeriodChange,

  activeTab,
  setActiveTab,
  selectedModalidadFilter,
  setSelectedModalidadFilter,
  prevTab,
  nextTab,
  navigateToTab,

  handleClearEntity,
  isWideLayout = false,
  dbSize = 0,
}: DashboardProps) {
  
  const contratosSize = React.useMemo(() => {
    if (!contratos || contratos.length === 0) return 0;
    try {
      return JSON.stringify(contratos).length;
    } catch (e) {
      return 0;
    }
  }, [contratos]);

  const handleForceRefresh = () => {
    loadContracts(true);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-stage">
      
      {/* Parallax Hero section visible across all views */}
      <ParallaxHero selectedEntity={selectedEntity} contratos={contratos} />
      
      {/* Step 2: Period Selector & controls */}
      {!isWideLayout && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          <div className="lg:col-span-2">
            <PeriodSelector 
              onPeriodChanged={handlePeriodChange} 
              loading={loading} 
              codigoEntidad={selectedEntity.codigo_entidad}
              isCollapsed={isPeriodCollapsed}
              setIsCollapsed={setIsPeriodCollapsed}
            />
          </div>

          {/* Reset/Refresh block */}
          <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl transition-all duration-300 shadow-xs flex flex-col justify-between ${
            isPeriodCollapsed 
              ? 'p-4 md:p-5 h-auto' 
              : 'p-6 h-full min-h-[195px]'
          }`}>
            {isPeriodCollapsed ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Vigencia Activa</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate animate-fade-in" title={periodLabel}>
                      {periodLabel}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <button
                    onClick={handleForceRefresh}
                    disabled={loading}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
                    title="Actualizar Datos"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                  <button
                    onClick={handleClearEntity}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                    title="Cambiar Entidad"
                  >
                    Cambiar
                  </button>
                  <button
                    onClick={() => setIsPeriodCollapsed(false)}
                    className="p-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center"
                    title="Expandir panel de fecha de firma"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Vigencia Seleccionada</div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> {periodLabel}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
                    Filtro activo sobre la fecha de firma. Los contratos que excedan los 5,000 registros serán truncados para optimizar la velocidad.
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleForceRefresh}
                    disabled={loading}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar Datos
                  </button>
                  <button
                    onClick={handleClearEntity}
                    className="py-2 px-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    Cambiar Entidad
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Step 3: Loading / Error States */}
      {loading ? (
        <DashboardSkeleton 
          entityName={selectedEntity?.nombre_entidad} 
          periodLabel={periodLabel} 
        />
      ) : error ? (
        <div className="p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-center space-y-4 shadow-xs">
          <p className="text-sm font-semibold text-red-800 dark:text-red-400">{error}</p>
          <button
            onClick={() => loadContracts(true)}
            className="px-4 py-2 bg-red-800 dark:bg-red-700 text-white text-xs font-semibold rounded-xl hover:bg-red-900 dark:hover:bg-red-600 transition-colors shadow-xs cursor-pointer"
          >
            Reintentar consulta
          </button>
        </div>
      ) : contratos.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl space-y-3 shadow-xs">
          <Compass className="w-8 h-8 text-slate-300 dark:text-slate-750 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sin registros de firma</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            La entidad <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedEntity.nombre_entidad}</span> no registra firmas de contratos electrónicos durante el periodo <span className="font-semibold text-slate-900 dark:text-slate-100">{periodLabel}</span>. Intente seleccionando otro rango o año anterior.
          </p>
        </div>
      ) : (
        
        /* Step 4: Primary Dashboard Tabs & Workspace */
        <div className="space-y-6">
          
          {/* Visual Tab Buttons Bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto space-x-1 sticky top-[72px] bg-slate-50 dark:bg-slate-950 pt-2 z-30 scrollbar-none">
            {/* Tab 1: Resumen */}
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-5 py-3 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'resumen'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Resumen de Entidad
            </button>

            {/* Tab 2: Contratos List */}
            <button
              onClick={() => setActiveTab('contratos')}
              className={`px-5 py-3 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'contratos'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" /> Contratos ({contratos.length})
            </button>

            {/* Tab 3: Supervisores */}
            <button
              onClick={() => setActiveTab('supervisores')}
              className={`px-5 py-3 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'supervisores'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Users2 className="w-4 h-4" /> Supervisores
            </button>

            {/* Tab 4: Recursos y Metricas */}
            <button
              onClick={() => setActiveTab('metricas')}
              className={`px-5 py-3 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'metricas'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BarChart4 className="w-4 h-4" /> Recursos y Métricas
            </button>
          </div>

          {/* Caching meta footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1.5">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-slate-750 dark:text-slate-350">Datos locales sincronizados (IndexedDB Cache)</span>
              </div>
              <span className="hidden md:inline text-slate-300 dark:text-slate-800">•</span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-450 px-2 py-0.5 rounded text-[9px] font-semibold border border-slate-200/40 dark:border-slate-750/30">
                Cache Total: <strong className="text-slate-800 dark:text-slate-200">{formatBytes(dbSize)}</strong>
              </span>
              <span className="bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-[9px] font-semibold border border-indigo-100/30 dark:border-indigo-900/10">
                Datos Consultados: <strong className="text-indigo-600 dark:text-indigo-350">{formatBytes(contratosSize)}</strong>
              </span>
            </div>
            {lastUpdated && (
              <span className="text-slate-450 dark:text-slate-500 shrink-0">Última sincronización: {lastUpdated} COP Local</span>
            )}
          </div>

          {/* Tab Content Canvas */}
          <div className="pt-2">
            {activeTab === 'resumen' && (
              <ResumenView 
                contratos={contratos}
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta}
                onModalityClick={(modality) => {
                  setSelectedModalidadFilter(modality);
                  setActiveTab('contratos');
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }}
              />
            )}
            {activeTab === 'contratos' && (
              <ContratosView 
                contratos={contratos} 
                selectedModalidad={selectedModalidadFilter}
                setSelectedModalidad={setSelectedModalidadFilter}
              />
            )}
            {activeTab === 'supervisores' && <SupervisoresView contratos={contratos} />}
            {activeTab === 'metricas' && <MetricasView contratos={contratos} fechaDesde={fechaDesde} fechaHasta={fechaHasta} />}
          </div>

          {/* Bottom Navigation Citizens Assistant */}
          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs" id="bottom-navigation-bar">
            <div className="flex-1 w-full sm:w-auto text-left">
              {prevTab ? (
                <button
                  onClick={() => navigateToTab(prevTab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer w-full sm:w-auto justify-center sm:justify-start"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Atrás: {prevTab.label}</span>
                </button>
              ) : (
                <div className="hidden sm:block w-10"></div>
              )}
            </div>

            <div className="w-full sm:w-auto text-center">
              <button
                onClick={handleClearEntity}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer w-full sm:w-auto justify-center"
                title="Volver a la selección de departamento y ciudad (Menú Principal)"
              >
                <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Volver al Menú Principal</span>
              </button>
            </div>

            <div className="flex-1 w-full sm:w-auto text-right flex justify-end">
              {nextTab ? (
                <button
                  onClick={() => navigateToTab(nextTab.id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold hover:shadow-md transition-all cursor-pointer w-full sm:w-auto justify-center sm:justify-end"
                >
                  <span>Siguiente: {nextTab.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="hidden sm:block w-10"></div>
              )}
            </div>
          </div>

          {/* Términos de Uso */}
          <div className="mt-6">
            <TerminosDeUso />
          </div>

        </div>
      )}

    </div>
  );
}
