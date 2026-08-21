import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Clock, RotateCw, ChevronUp, ChevronDown, Sliders } from 'lucide-react';
import { getContractYears } from '../services/api';

interface PeriodSelectorProps {
  onPeriodChanged: (fechaDesde: string, fechaHasta: string, label: string) => void;
  loading: boolean;
  codigoEntidad?: string;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
  isSidebarMode?: boolean;
}

export default function PeriodSelector({ 
  onPeriodChanged, 
  loading, 
  codigoEntidad,
  isCollapsed: propIsCollapsed,
  setIsCollapsed: propSetIsCollapsed,
  isSidebarMode = false
}: PeriodSelectorProps) {
  const [anios, setAnios] = useState<string[]>([]);
  const [selectedAnio, setSelectedAnio] = useState<string>('');
  const [loadingAnios, setLoadingAnios] = useState(false);
  const [modoPeriodo, setModoPeriodo] = useState<'anio' | '30' | '90' | '180' | 'rango'>('anio');

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [localIsCollapsed, setLocalIsCollapsed] = useState(false);
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : localIsCollapsed;
  const setIsCollapsed = propSetIsCollapsed || setLocalIsCollapsed;

  const [currentPeriodLabel, setCurrentPeriodLabel] = useState('');

  const currentYear = new Date().getFullYear();

  // Load years from SECOP whenever the entity changes
  useEffect(() => {
    if (!codigoEntidad) {
      const cy = new Date().getFullYear();
      setAnios([String(cy), String(cy - 1)]);
      setSelectedAnio(String(cy));
      setModoPeriodo('anio');
      return;
    }

    async function loadYears() {
      setLoadingAnios(true);
      try {
        const list = await getContractYears(codigoEntidad!);
        if (list.length > 0) {
          setAnios(list);
          setSelectedAnio(list[0]); // Most recent year is always index 0
          setModoPeriodo('anio');
        } else {
          const cy = new Date().getFullYear();
          setAnios([String(cy), String(cy - 1)]);
          setSelectedAnio(String(cy));
          setModoPeriodo('anio');
        }
      } catch (err) {
        console.error("Error loading dynamic years:", err);
        const cy = new Date().getFullYear();
        setAnios([String(cy), String(cy - 1)]);
        setSelectedAnio(String(cy));
        setModoPeriodo('anio');
      } finally {
        setLoadingAnios(false);
      }
    }

    loadYears();
  }, [codigoEntidad]);

  // Handle year changes from the UI
  const handleAnioChange = (y: string) => {
    setSelectedAnio(y);
    const mostRecent = anios[0] || String(currentYear);
    if (y !== mostRecent) {
      // If switching to historical, reset period mode to whole year
      setModoPeriodo('anio');
    }
    setIsCollapsed(true);
  };

  // Process period selection and trigger parent update
  useEffect(() => {
    if (!selectedAnio) return;

    const hoy = new Date();
    let desde = new Date();
    let hasta = new Date();
    let label = '';

    const mostRecentYear = anios[0] || String(currentYear);
    const isMostRecent = selectedAnio === mostRecentYear;

    if (modoPeriodo === 'anio') {
      desde = new Date(`${selectedAnio}-01-01T00:00:00`);
      hasta = new Date(`${selectedAnio}-12-31T23:59:59`);
      label = `Año ${selectedAnio} (Vigencia Firma)`;
    } else if (modoPeriodo === '30') {
      const referencia = isMostRecent ? hoy : new Date(`${selectedAnio}-12-31T23:59:59`);
      hasta = new Date(referencia);
      desde = new Date(referencia);
      desde.setDate(referencia.getDate() - 30);
      label = isMostRecent ? `Últimos 30 días (Firma)` : `Últimos 30 días de ${selectedAnio} (Firma)`;
    } else if (modoPeriodo === '90') {
      const referencia = isMostRecent ? hoy : new Date(`${selectedAnio}-12-31T23:59:59`);
      hasta = new Date(referencia);
      desde = new Date(referencia);
      desde.setDate(referencia.getDate() - 90);
      label = isMostRecent ? `Últimos 90 días (Firma)` : `Últimos 90 días de ${selectedAnio} (Firma)`;
    } else if (modoPeriodo === '180') {
      const referencia = isMostRecent ? hoy : new Date(`${selectedAnio}-12-31T23:59:59`);
      hasta = new Date(referencia);
      desde = new Date(referencia);
      desde.setDate(referencia.getDate() - 180);
      label = isMostRecent ? `Últimos 6 meses (Firma)` : `Últimos 6 meses de ${selectedAnio} (Firma)`;
    } else if (modoPeriodo === 'rango') {
      const d = new Date(fechaDesde + 'T00:00:00');
      const h = new Date(fechaHasta + 'T23:59:59');
      if (isNaN(d.getTime()) || isNaN(h.getTime())) {
        setError('Fechas inválidas');
        return;
      }
      if (d > h) {
        setError('La fecha inicial no puede ser posterior a la fecha final.');
        return;
      }
      setError(null);
      const customLabel = `Rango: ${fechaDesde} al ${fechaHasta}`;
      setCurrentPeriodLabel(customLabel);
      onPeriodChanged(fechaDesde, fechaHasta, customLabel);
      return;
    } else {
      // Fallback
      desde = new Date(`${selectedAnio}-01-01T00:00:00`);
      hasta = new Date(`${selectedAnio}-12-31T23:59:59`);
      label = `Año ${selectedAnio} (Vigencia Firma)`;
    }

    setError(null);
    const dStr = desde.toISOString().split('T')[0];
    const hStr = hasta.toISOString().split('T')[0];

    // Synchronize inputs for custom range fallback
    setFechaDesde(dStr);
    setFechaHasta(hStr);

    setCurrentPeriodLabel(label);
    onPeriodChanged(dStr, hStr, label);
  }, [selectedAnio, modoPeriodo]);

  const handleCustomDateSubmit = () => {
    const d = new Date(fechaDesde + 'T00:00:00');
    const h = new Date(fechaHasta + 'T23:59:59');
    if (isNaN(d.getTime()) || isNaN(h.getTime())) {
      setError('Fechas inválidas');
      return;
    }
    if (d > h) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    setError(null);
    const label = `Rango: ${fechaDesde} al ${fechaHasta}`;
    setCurrentPeriodLabel(label);
    onPeriodChanged(fechaDesde, fechaHasta, label);
    setIsCollapsed(true);
  };

  const mostRecentYear = anios[0] || String(currentYear);
  const isMostRecentActive = selectedAnio === mostRecentYear;

  if (isCollapsed) {
    return (
      <div 
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 animate-fade-in hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm"
        id="period-selector-collapsed"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/50 shrink-0">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Eje Temporal de Firma</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/50 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {currentPeriodLabel || `Año ${selectedAnio || currentYear}`}
              </span>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1 truncate" title={currentPeriodLabel}>
              {currentPeriodLabel ? `Filtro activo: ${currentPeriodLabel}` : `Consultando vigencia del año ${selectedAnio}`}
            </h4>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          {(selectedAnio !== (anios[0] || String(currentYear)) || modoPeriodo !== 'anio') && (
            <button
              onClick={() => {
                if (anios.length > 0) {
                  setSelectedAnio(anios[0]);
                }
                setModoPeriodo('anio');
                setError(null);
                setIsCollapsed(false);
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs font-mono"
              title="Restablecer filtros de fechas"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Restablecer</span>
            </button>
          )}
          
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex-1 md:flex-none px-4 py-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs shrink-0 font-mono"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Ajustar Fechas</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col ${isSidebarMode ? 'p-4 gap-4' : 'p-6 gap-6'}`} id="period-selector-card">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            Eje Temporal (Fecha de Firma)
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {loadingAnios && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono animate-fade-in">
              <RotateCw className="w-3 h-3 animate-spin text-indigo-500" />
              <span>Consultando...</span>
            </div>
          )}
          {(selectedAnio !== (anios[0] || String(currentYear)) || modoPeriodo !== 'anio') && (
            <button
              onClick={() => {
                if (anios.length > 0) {
                  setSelectedAnio(anios[0]);
                }
                setModoPeriodo('anio');
                setError(null);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
              title="Restablecer eje temporal al año más reciente"
            >
              <RotateCw className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Restablecer
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-lg text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Minimizar panel de fecha de firma"
          >
            <span>Contraer Panel</span>
            <ChevronUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${isSidebarMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {/* Columna 1: Vigencias registradas */}
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">1. Año / Vigencia</span>
          </div>
          
          <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
            {anios.map((y) => {
              const active = selectedAnio === y && modoPeriodo !== 'rango';
              return (
                <button
                  key={y}
                  onClick={() => handleAnioChange(y)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
            Años con firmas de contratos registradas para esta entidad en SECOP II.
          </p>
        </div>

        {/* Columna 2: Atajos y Filtros de Tiempo Real */}
        <div className={`space-y-3 border-slate-100 dark:border-slate-800 ${
          isSidebarMode 
            ? 'border-t pt-4' 
            : 'border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">2. Atajo Temporal</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Botón Año Completo */}
            <button
              onClick={() => { setModoPeriodo('anio'); setIsCollapsed(true); }}
              disabled={loading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                modoPeriodo === 'anio'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Año Completo
            </button>

            {/* Atajo 30 días */}
            <button
              onClick={() => { setModoPeriodo('30'); setIsCollapsed(true); }}
              disabled={loading}
              title={"Últimos 30 días"}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                modoPeriodo === '30'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              30 días
            </button>

            {/* Atajo 90 días */}
            <button
              onClick={() => { setModoPeriodo('90'); setIsCollapsed(true); }}
              disabled={loading}
              title={"Últimos 90 días"}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                modoPeriodo === '90'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              90 días
            </button>

            {/* Atajo 6 meses */}
            <button
              onClick={() => { setModoPeriodo('180'); setIsCollapsed(true); }}
              disabled={loading}
              title={"Últimos 6 meses"}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                modoPeriodo === '180'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              6 meses
            </button>

            {/* Rango Personalizado */}
            <button
              onClick={() => setModoPeriodo('rango')}
              disabled={loading}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                modoPeriodo === 'rango'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              Personalizado
            </button>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
            {`Atajos de tiempo activos. Seleccione un botón para acotar la búsqueda${!isMostRecentActive ? ` dentro de ${selectedAnio}` : ''}.`}
          </p>
        </div>
      </div>

      {/* Rango Personalizado de Fechas */}
      {modoPeriodo === 'rango' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase font-semibold">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-all cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase font-semibold">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 transition-all cursor-pointer"
              />
            </div>
            <button
              onClick={handleCustomDateSubmit}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 h-[32px] cursor-pointer shadow-xs hover:shadow-sm"
            >
              Aplicar Rango
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
