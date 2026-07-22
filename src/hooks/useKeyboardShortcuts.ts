import { useEffect } from 'react';
import { DashboardTab, TABS_LIST } from './useDashboard';

interface UseKeyboardShortcutsProps {
  activeTab: DashboardTab;
  navigateToTab: (tab: DashboardTab) => void;
  toggleOnboarding: () => void;
}

export function useKeyboardShortcuts({
  activeTab,
  navigateToTab,
  toggleOnboarding,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();

      // Ctrl + H / Cmd + H: Toggle/Open tutorial onboarding
      if (key === 'h') {
        e.preventDefault();
        toggleOnboarding();
        return;
      }

      // Ctrl + ArrowRight / Cmd + ArrowRight: Next tab in dashboard
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const currentIdx = TABS_LIST.findIndex(t => t.id === activeTab);
        const nextIdx = (currentIdx + 1) % TABS_LIST.length;
        navigateToTab(TABS_LIST[nextIdx].id);
        return;
      }

      // Ctrl + ArrowLeft / Cmd + ArrowLeft: Previous tab in dashboard
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentIdx = TABS_LIST.findIndex(t => t.id === activeTab);
        const prevIdx = (currentIdx - 1 + TABS_LIST.length) % TABS_LIST.length;
        navigateToTab(TABS_LIST[prevIdx].id);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, navigateToTab, toggleOnboarding]);
}
