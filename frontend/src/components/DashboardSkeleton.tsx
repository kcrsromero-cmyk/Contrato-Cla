import React from 'react';
import { RefreshCw, Database, Sparkles, Layers } from 'lucide-react';

interface DashboardSkeletonProps {
  entityName?: string;
  periodLabel?: string;
}

export default function DashboardSkeleton({ entityName, periodLabel }: DashboardSkeletonProps) {
  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-skeleton-screen">
      
      {/* 1. TOP PROCESSING & SYNCHRONIZATION STATUS BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 border border-indigo-500/30 dark:border-indigo-800/50 rounded-3xl p-6 shadow-xl text-white">
        {/* Ambient shimmer background layer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent animate-pulse pointer-events-none" />
        
        {/* Animated Top Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 animate-pulse w-3/4 rounded-r-full shadow-sm" />
        </div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-indigo-600/30 border border-indigo-400/30 rounded-2xl shrink-0 shadow-inner">
              <RefreshCw className="w-6 h-6 text-indigo-300 animate-spin" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  <Sparkles className="w-3 h-3 text-indigo-300" /> Procesando Datos SECOP II
                </span>
                {periodLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
                    {periodLabel}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {entityName ? `Procesando registros de ${entityName}...` : 'Descargando y procesando volumen contractual...'}
              </h3>
              <p className="text-xs text-indigo-200/80 max-w-xl leading-relaxed">
                Consultando SECOP II y estructurando tableros analíticos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Preparando resultados...</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB BUTTONS BAR SKELETON */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 pt-2">
        {[
          { label: 'Resumen de Entidad', width: 'w-36' },
          { label: 'Contratos', width: 'w-28' },
          { label: 'Supervisores', width: 'w-28' },
          { label: 'Recursos y Métricas', width: 'w-36' }
        ].map((tab, idx) => (
          <div
            key={idx}
            className="px-5 py-3 flex items-center gap-2 border-b-2 border-transparent"
          >
            <div className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className={`h-3.5 ${tab.width} rounded bg-slate-200 dark:bg-slate-800 animate-pulse`} />
          </div>
        ))}
      </div>

      {/* 3. METHODOLOGY BANNER SKELETON */}
      <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-800 animate-pulse" />
          <div className="h-3 w-48 bg-slate-300 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-900 rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-slate-200 dark:bg-slate-900 rounded animate-pulse" />
      </div>

      {/* 4. KPI CARDS SKELETON GRID (4 Primary Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Contratos Registrados', color: 'indigo' },
          { title: 'Monto Contratado', color: 'emerald' },
          { title: 'Monto Pagado', color: 'sky' },
          { title: 'Monto por Ejecutar', color: 'amber' }
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-850 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 5. SECONDARY STATS SKELETON GRID (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((_, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xs"
          >
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ))}
      </div>

      {/* 6. ANNUAL TIMELINE / TREND GRAPH SKELETON */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-2">
            <div className="h-4 w-52 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-80 bg-slate-100 dark:bg-slate-850 rounded animate-pulse" />
          </div>
          <div className="h-7 w-32 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>

        {/* 12 Months Vertical Bars Skeleton */}
        <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-36 pt-4">
          {[40, 65, 30, 85, 50, 95, 70, 45, 80, 60, 90, 75].map((heightPct, i) => (
            <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
              <div
                className="w-full bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/40 rounded-t-lg animate-pulse"
                style={{ height: `${heightPct}%` }}
              />
              <div className="h-2.5 w-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* 7. TWO-COLUMN ANALYTICAL PANELS SKELETON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Top Contractors Skeleton */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-100 dark:bg-slate-850 rounded animate-pulse" />
            </div>
            <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400/50 dark:bg-indigo-600/50 rounded-full animate-pulse"
                    style={{ width: `${100 - i * 18}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Contract Types Donut Skeleton */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-56 bg-slate-100 dark:bg-slate-850 rounded animate-pulse" />
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="w-40 h-40 rounded-full border-8 border-slate-200 dark:border-slate-800 border-t-indigo-500 border-r-indigo-400 animate-pulse flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900" />
            </div>
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
