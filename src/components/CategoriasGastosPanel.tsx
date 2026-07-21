import React, { useMemo } from 'react';
import { Contrato } from '../types';
import { CategoriaSpendingSummary, CategoriaMeta } from '../utils/categorizer';
import { formatCOP, formatNumber, formatCurrencyMillions } from '../utils/helpers';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';

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
      avgCost
    };
  }, [summaries, totalGastado]);

  return (
    <div className="space-y-6" id="categorias-gastos-panel">
      {/* Title block */}
      <div className="bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-slate-950 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1.5">
          <Icons.PieChart className="w-5 h-5" />
          <h3 className="font-bold text-sm uppercase font-mono tracking-wider">
            ¿En qué se gastó el dinero?
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
          Clasificación automática del objeto de contratación del municipio para que no tenga que leer cientos de contratos.
        </p>

        {insights && (
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-indigo-100/55 dark:border-slate-800/80">
            <div className="bg-white/80 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
              <span className="block text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Destino Principal</span>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={insights.topCategory.categoria.label}>
                {insights.topCategory.categoria.label}
              </span>
              <span className="block text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {insights.topCategory.porcentajeValor.toFixed(1)}% del total
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
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

      {/* Main categories listing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold font-mono text-slate-450 dark:text-slate-500 uppercase tracking-widest">
            Categorías Detectadas
          </span>
          {selectedCategory && (
            <button
              onClick={() => onSelectCategory('')}
              className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <Icons.X className="w-3 h-3" /> Ver Todos
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {summaries.map((summary) => {
            const { categoria, totalValor, contratosCount, porcentajeValor } = summary;
            const isSelected = selectedCategory === categoria.id;
            const hasContracts = contratosCount > 0;
            const Icon = getCategoryIcon(categoria.iconName);

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
                {/* Background decorative blob for styling */}
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
      </div>
    </div>
  );
}
