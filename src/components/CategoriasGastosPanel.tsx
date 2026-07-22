import React, { useMemo, useState } from 'react';
import { Contrato } from '../types';
import { CategoriaSpendingSummary, CategoriaMeta } from '../utils/categorizer';
import { formatCOP, formatNumber, formatCurrencyMillions } from '../utils/helpers';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Dynamic icon mapper helper
const getCategoryIcon = (iconName: string) => {
  const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
  return IconComponent;
};

interface CategoriasGastosPanelProps {
  summaries: CategoriaSpendingSummary[];
  totalGastado: number;
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
}

export default function CategoriasGastosPanel({
  summaries,
  totalGastado,
  selectedCategory,
  onSelectCategory
}: CategoriasGastosPanelProps) {
  // State for collapsible panel and view modes
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Calculate top spending insights
  const insights = useMemo(() => {
    const validSummaries = summaries.filter(s => s.contratosCount > 0);
    if (validSummaries.length === 0) return null;
    
    // Sort to find top
    const sorted = [...validSummaries].sort((a, b) => b.totalValor - a.totalValor);
    const top = sorted[0];
    
    // Total contracts
    const totalContratos = summaries.reduce((acc, s) => acc + s.contratosCount, 0);
    
    // Average cost
    const avgCost = totalContratos > 0 ? totalGastado / totalContratos : 0;
    
    return {
      topCategory: top,
      totalContratos,
      avgCost,
      validSummariesCount: validSummaries.length
    };
  }, [summaries, totalGastado]);

  // Determine displayed categories (limit to top 4 unless showAllCategories is true)
  const displayedSummaries = useMemo(() => {
    if (showAllCategories || summaries.length <= 4) {
      return summaries;
    }
    // Always include selected category if it's beyond index 3
    const top4 = summaries.slice(0, 4);
    if (selectedCategory && !top4.some(s => s.categoria.id === selectedCategory)) {
      const selectedItem = summaries.find(s => s.categoria.id === selectedCategory);
      if (selectedItem) return [...top4, selectedItem];
    }
    return top4;
  }, [summaries, showAllCategories, selectedCategory]);

  const hiddenCount = summaries.length - displayedSummaries.length;

  return (
    <div className="space-y-4" id="categorias-gastos-panel">
      {/* Title block with expand/collapse control */}
      <div className="bg-gradient-to-br from-indigo-50/90 to-slate-50 dark:from-slate-950 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs transition-all duration-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 min-w-0">
            <Icons.PieChart className="w-5 h-5 shrink-0" />
            <h3 className="font-bold text-sm uppercase font-mono tracking-wider truncate">
              Distribución por Categoría
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="p-1.5 rounded-lg border border-indigo-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
              title={isPanelCollapsed ? "Expandir panel de categorías" : "Minimizar panel de categorías"}
            >
              {isPanelCollapsed ? (
                <Icons.ChevronDown className="w-4 h-4" />
              ) : (
                <Icons.ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans mt-1.5">
          Clasificación temática del objeto de contratación del municipio para facilitar el análisis del gasto público.
        </p>

        {/* Collapsed view summary badge */}
        {isPanelCollapsed && insights && (
          <div className="mt-3 pt-3 border-t border-indigo-100/60 dark:border-slate-800 flex items-center justify-between gap-2 animate-fade-in text-xs font-mono">
            <span className="text-slate-600 dark:text-slate-400 font-medium truncate">
              Top: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{insights.topCategory.categoria.label}</strong> ({insights.topCategory.porcentajeValor.toFixed(1)}%)
            </span>
            <button
              onClick={() => setIsPanelCollapsed(false)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
            >
              Ver detalles
            </button>
          </div>
        )}

        {/* Full header insights */}
        {!isPanelCollapsed && insights && (
          <div className="grid grid-cols-2 gap-2.5 mt-3.5 pt-3.5 border-t border-indigo-100/60 dark:border-slate-800/80">
            <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="block text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Destino Principal</span>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={insights.topCategory.categoria.label}>
                {insights.topCategory.categoria.label}
              </span>
              <span className="block text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {insights.topCategory.porcentajeValor.toFixed(1)}% del total
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="block text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Valor Promedio</span>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                {formatCurrencyMillions(insights.avgCost)}
              </span>
              <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                por contrato
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main categories listing (Hidden when panel is collapsed) */}
      {!isPanelCollapsed && (
        <div className="space-y-3 animate-fade-in">
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold font-mono text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                Categorías ({summaries.length})
              </span>
              {selectedCategory && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 rounded-full text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  Filtro activo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Density Toggle (Compact vs Normal) */}
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title={isCompactView ? "Cambiar a vista detallada" : "Cambiar a vista compacta para ahorrar espacio"}
              >
                {isCompactView ? (
                  <>
                    <Icons.LayoutGrid className="w-3 h-3 text-indigo-500" />
                    <span>Detallado</span>
                  </>
                ) : (
                  <>
                    <Icons.List className="w-3 h-3 text-indigo-500" />
                    <span>Compacto</span>
                  </>
                )}
              </button>

              {/* Clear Filter Button */}
              {selectedCategory && (
                <button
                  onClick={() => onSelectCategory('')}
                  className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Icons.X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Cards List */}
          <div className={isCompactView ? "space-y-1.5" : "space-y-2.5"}>
            {displayedSummaries.map((summary) => {
              const { categoria, totalValor, contratosCount, porcentajeValor } = summary;
              const isSelected = selectedCategory === categoria.id;
              const hasContracts = contratosCount > 0;
              const Icon = getCategoryIcon(categoria.iconName);

              if (isCompactView) {
                // Compact high-density layout
                return (
                  <button
                    key={categoria.id}
                    onClick={() => onSelectCategory(isSelected ? '' : categoria.id)}
                    disabled={!hasContracts && !selectedCategory}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : hasContracts
                        ? `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-800 dark:text-slate-100`
                        : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-900 opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                    }`}
                    title={categoria.descripcion}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected 
                          ? 'bg-white/15 text-white' 
                          : `${categoria.bgClass} ${categoria.colorClass}`
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {categoria.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                      <span className={`text-[10px] font-semibold ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                        ({contratosCount})
                      </span>
                      <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                        {formatCurrencyMillions(totalValor)}
                      </span>
                    </div>
                  </button>
                );
              }

              // Standard detailed card layout
              return (
                <button
                  key={categoria.id}
                  onClick={() => onSelectCategory(isSelected ? '' : categoria.id)}
                  disabled={!hasContracts && !selectedCategory}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-600/10'
                      : hasContracts
                      ? `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600/60 ${categoria.hoverClass} text-slate-800 dark:text-slate-100`
                      : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-900 opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  }`}
                  title={categoria.descripcion}
                >
                  {/* Background decorative icon blob */}
                  <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                    <Icon className="w-20 h-20" />
                  </div>

                  <div className="flex items-start justify-between gap-2 z-10 w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isSelected 
                          ? 'bg-white/15 text-white' 
                          : `${categoria.bgClass} ${categoria.colorClass} border ${categoria.borderClass}`
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`block text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                          {categoria.label}
                        </span>
                        <span className={`block text-[10px] font-mono mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500 font-semibold'}`}>
                          {contratosCount} {contratosCount === 1 ? 'contrato' : 'contratos'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`block text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                        {formatCurrencyMillions(totalValor)}
                      </span>
                      <span className={`block text-[10px] font-mono mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500 font-medium'}`}>
                        {porcentajeValor.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Custom colored progress bar inside card */}
                  {hasContracts && (
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950/50 rounded-full overflow-hidden mt-1 z-10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSelected 
                            ? 'bg-white' 
                            : categoria.id === 'otros' 
                            ? 'bg-slate-400 dark:bg-slate-500' 
                            : 'bg-indigo-600 dark:bg-indigo-400'
                        }`}
                        style={{ width: `${porcentajeValor}%` }}
                      />
                    </div>
                  )}

                  {/* Selected active indicator badge */}
                  {isSelected && (
                    <div className="absolute right-3 top-3 text-indigo-200">
                      <Icons.CheckCircle2 className="w-4 h-4 fill-white text-indigo-600" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Expand / Collapse remaining categories toggle */}
          {summaries.length > 4 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {showAllCategories ? (
                <>
                  <Icons.ChevronUp className="w-3.5 h-3.5" />
                  <span>Mostrar menos categorías</span>
                </>
              ) : (
                <>
                  <Icons.ChevronDown className="w-3.5 h-3.5" />
                  <span>Ver todas las categorías ({summaries.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

