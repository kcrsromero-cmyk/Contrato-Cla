import { AuthProvider } from './context/AuthContext';
import React from 'react';
import { useTheme } from './hooks/useTheme';
import { usePeriodo } from './hooks/usePeriodo';
import { useContratos } from './hooks/useContratos';
import { useEntidad } from './hooks/useEntidad';
import { useDashboard, DashboardTab } from './hooks/useDashboard';
import { useWindowWidth } from './hooks/useWindowWidth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import AppLayout from './components/AppLayout';
import TerritorialSelector from './components/TerritorialSelector';
import PeriodSelector from './components/PeriodSelector';
import Dashboard from './components/Dashboard';
import OnboardingModal from './components/OnboardingModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import FavoritesModal from './components/FavoritesModal';
import ContractDetailModal from './components/ContractDetailModal';
import { FavoritesProvider } from './context/FavoritesContext';
import { Contrato } from './types';
import { ArrowLeft, Sliders, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { formatBytes } from './utils/helpers';

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <AppContent />
      </FavoritesProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { theme, toggleTheme, easyRead, toggleEasyRead } = useTheme();
  const windowWidth = useWindowWidth();
  
  const [isOnboardingOpen, setIsOnboardingOpen] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = React.useState(false);
  const [favoritesDefaultTab, setFavoritesDefaultTab] = React.useState<'entities' | 'contracts'>('entities');
  const [selectedContractForDetail, setSelectedContractForDetail] = React.useState<Contrato | null>(null);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = React.useState(false);

  const handleCloseOnboarding = () => {
    setIsOnboardingOpen(false);
  };

  const handleFocusTerritorial = () => {
    handleCloseOnboarding();
    const el = document.getElementById('step-territorial-navigation');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFocusPeriod = () => {
    handleCloseOnboarding();
    const el = document.getElementById('period-selector-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  const handleNavigateTabFromOnboarding = (tab: DashboardTab) => {
    handleCloseOnboarding();
    navigateToTab(tab);
  };
  
  const { 
    selectedEntity, 
    setSelectedEntity, 
    clearEntity, 
    handleClearCache 
  } = useEntidad();
  
  const {
    fechaDesde,
    fechaHasta,
    periodLabel,
    isPeriodCollapsed,
    setIsPeriodCollapsed,
    handlePeriodChange,
  } = usePeriodo();
  
  const {
    contratos,
    loading,
    error,
    lastUpdated,
    loadContracts,
    dbSize,
  } = useContratos(selectedEntity, fechaDesde, fechaHasta);
  
  const {
    activeTab,
    setActiveTab,
    selectedModalidadFilter,
    setSelectedModalidadFilter,
    prevTab,
    nextTab,
    navigateToTab,
    resetDashboard,
  } = useDashboard();

  const toggleOnboarding = React.useCallback(() => {
    setIsOnboardingOpen(prev => !prev);
  }, []);

  useKeyboardShortcuts({
    activeTab,
    navigateToTab,
    toggleOnboarding,
  });

  const handleClearEntityAndReset = async () => {
    await clearEntity();
    resetDashboard();
  };

  const isWideLayout = windowWidth >= 1900;

  const contratosSizeInBytes = React.useMemo(() => {
    if (!contratos || contratos.length === 0) return 0;
    try {
      return JSON.stringify(contratos).length;
    } catch (e) {
      return 0;
    }
  }, [contratos]);

  return (
    <>
      <AppLayout
        theme={theme}
        toggleTheme={toggleTheme}
        easyRead={easyRead}
        toggleEasyRead={toggleEasyRead}
        handleClearCache={() => setShowClearCacheConfirm(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenFavorites={() => {
          setFavoritesDefaultTab('entities');
          setIsFavoritesModalOpen(true);
        }}
      >
      {/* If an entity is selected and we are on a wide screen, render the Dual Column Sidebar layout */}
      {selectedEntity && isWideLayout ? (
        <div className="grid grid-cols-1 [@media(min-width:1900px)]:grid-cols-[420px_1fr] gap-8 items-start animate-fade-in">
          
          {/* Left Column (Sticky Sidebar Panel) */}
          <aside className="space-y-6 [@media(min-width:1900px)]:sticky [@media(min-width:1900px)]:top-[90px] [@media(min-width:1900px)]:max-h-[calc(100vh-140px)] [@media(min-width:1900px)]:overflow-y-auto pr-1.5 custom-scrollbar">
            
            {/* Header decor block */}
            <div className="bg-linear-to-r from-indigo-50/70 to-transparent dark:from-indigo-950/20 dark:to-transparent p-2.5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 shadow-2xs">
              <div className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Panel Lateral de Auditoría
              </div>
            </div>

            {/* Sidebar Territorial Selector */}
            <TerritorialSelector 
              onEntitySelected={setSelectedEntity} 
              selectedEntity={selectedEntity} 
              isSidebarMode={true}
            />

            {/* Sidebar Period Selector */}
            <PeriodSelector 
              onPeriodChanged={handlePeriodChange}
              loading={loading}
              codigoEntidad={selectedEntity.codigo_entidad}
              isCollapsed={isPeriodCollapsed}
              setIsCollapsed={setIsPeriodCollapsed}
              isSidebarMode={true}
            />

            {/* Sidebar Action Center Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Control de Consulta</h4>
              </div>
              
              {/* Dynamic lastUpdated timestamp & storage usage */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sincronización Local</div>
                  <div className="text-xs text-slate-700 dark:text-slate-350 font-semibold flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {lastUpdated ? lastUpdated : 'Pendiente'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-mono">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div className="text-slate-400 dark:text-slate-500 mb-0.5 text-[8px] uppercase tracking-wider">Cache Total</div>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">{formatBytes(dbSize)}</div>
                  </div>
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-xl border border-indigo-100/20 dark:border-indigo-900/10">
                    <div className="text-indigo-500/80 dark:text-indigo-400/80 mb-0.5 text-[8px] uppercase tracking-wider">En pantalla</div>
                    <div className="font-extrabold text-indigo-650 dark:text-indigo-400">{formatBytes(contratosSizeInBytes)}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => loadContracts(true)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Actualizando...' : 'Actualizar Datos'}</span>
                </button>
                
                <button
                  onClick={handleClearEntityAndReset}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 transition-all text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cambiar Entidad</span>
                </button>
              </div>
            </div>

          </aside>

          {/* Right Column (Main Canvas Area) */}
          <div className="space-y-8 min-w-0">
            <Dashboard
              selectedEntity={selectedEntity}
              contratos={contratos}
              loading={loading}
              error={error}
              lastUpdated={lastUpdated}
              loadContracts={loadContracts}
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              periodLabel={periodLabel}
              isPeriodCollapsed={isPeriodCollapsed}
              setIsPeriodCollapsed={setIsPeriodCollapsed}
              handlePeriodChange={handlePeriodChange}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedModalidadFilter={selectedModalidadFilter}
              setSelectedModalidadFilter={setSelectedModalidadFilter}
              prevTab={prevTab}
              nextTab={nextTab}
              navigateToTab={navigateToTab}
              handleClearEntity={handleClearEntityAndReset}
              isWideLayout={true}
              dbSize={dbSize}
              onViewContractDetail={setSelectedContractForDetail}
            />
          </div>

        </div>
      ) : (
        /* Traditional Vertical Stack layout (Standard Viewports) */
        <>
          {/* Step 1: Territorial selection */}
          <section id="step-territorial-navigation">
            <TerritorialSelector 
              onEntitySelected={setSelectedEntity} 
              selectedEntity={selectedEntity} 
              isSidebarMode={false}
            />
          </section>

          {selectedEntity && (
            <Dashboard
              selectedEntity={selectedEntity}
              contratos={contratos}
              loading={loading}
              error={error}
              lastUpdated={lastUpdated}
              loadContracts={loadContracts}
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              periodLabel={periodLabel}
              isPeriodCollapsed={isPeriodCollapsed}
              setIsPeriodCollapsed={setIsPeriodCollapsed}
              handlePeriodChange={handlePeriodChange}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedModalidadFilter={selectedModalidadFilter}
              setSelectedModalidadFilter={setSelectedModalidadFilter}
              prevTab={prevTab}
              nextTab={nextTab}
              navigateToTab={navigateToTab}
              handleClearEntity={handleClearEntityAndReset}
              isWideLayout={false}
              dbSize={dbSize}
              onViewContractDetail={setSelectedContractForDetail}
            />
          )}
        </>
      )}
    </AppLayout>

    <OnboardingModal
      isOpen={isOnboardingOpen}
      onClose={handleCloseOnboarding}
      onNavigateTab={handleNavigateTabFromOnboarding}
      onFocusTerritorial={handleFocusTerritorial}
      onFocusPeriod={handleFocusPeriod}
      easyRead={easyRead}
    />
    <ProfileModal
      isOpen={isProfileModalOpen}
      onClose={() => setIsProfileModalOpen(false)}
      onLogout={() => {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.reload();
      }}
    />
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
    />
    <FavoritesModal
      isOpen={isFavoritesModalOpen}
      onClose={() => setIsFavoritesModalOpen(false)}
      onSelectEntity={setSelectedEntity}
      defaultTab={favoritesDefaultTab}
      onViewContractDetail={setSelectedContractForDetail}
    />

    <ContractDetailModal
      contract={selectedContractForDetail}
      onClose={() => setSelectedContractForDetail(null)}
    />

    {showClearCacheConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={() => setShowClearCacheConfirm(false)} />
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-up">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">¿Limpiar caché local?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Se borrarán los datos guardados en este dispositivo. Tendrás que volver a descargar los datos.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClearCacheConfirm(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowClearCacheConfirm(false);
                  handleClearCache();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Sí, limpiar caché
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
