import { useState } from 'react';

export type DashboardTab = 'resumen' | 'contratos' | 'supervisores' | 'metricas';

export const TABS_LIST: { id: DashboardTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen de Entidad' },
  { id: 'contratos', label: 'Listado de Contratos' },
  { id: 'supervisores', label: 'Supervisores' },
  { id: 'metricas', label: 'Recursos y Métricas' }
];

export function useDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen');
  const [selectedModalidadFilter, setSelectedModalidadFilter] = useState('');

  const currentIdx = TABS_LIST.findIndex(t => t.id === activeTab);
  const prevTab = currentIdx > 0 ? TABS_LIST[currentIdx - 1] : null;
  const nextTab = currentIdx < TABS_LIST.length - 1 ? TABS_LIST[currentIdx + 1] : null;

  const navigateToTab = (tabId: DashboardTab) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const resetDashboard = () => {
    setActiveTab('resumen');
    setSelectedModalidadFilter('');
  };

  return {
    activeTab,
    setActiveTab,
    selectedModalidadFilter,
    setSelectedModalidadFilter,
    prevTab,
    nextTab,
    navigateToTab,
    resetDashboard,
  };
}
