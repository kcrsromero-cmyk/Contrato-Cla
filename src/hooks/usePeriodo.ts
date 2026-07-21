import { useState } from 'react';

export function usePeriodo() {
  const currentYear = new Date().getFullYear();
  const [fechaDesde, setFechaDesde] = useState(`${currentYear}-01-01`);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [periodLabel, setPeriodLabel] = useState(`Este año (${currentYear})`);
  const [isPeriodCollapsed, setIsPeriodCollapsed] = useState(false);

  const handlePeriodChange = (desde: string, hasta: string, label: string) => {
    setFechaDesde(desde);
    setFechaHasta(hasta);
    setPeriodLabel(label);
  };

  return {
    fechaDesde,
    fechaHasta,
    periodLabel,
    isPeriodCollapsed,
    setIsPeriodCollapsed,
    handlePeriodChange,
  };
}
