import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { SimilarObjectGroup } from './types';
import { formatCOP } from './utils';

interface SimilitudLexicaTabProps {
  similarObjectsGroups: SimilarObjectGroup[];
  setSelectedSimilarGroup: (group: SimilarObjectGroup) => void;
  isCalculatingSimilar?: boolean;
}

export const SimilitudLexicaTab: React.FC<SimilitudLexicaTabProps> = ({
  similarObjectsGroups,
  setSelectedSimilarGroup,
  isCalculatingSimilar = false,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs animate-fade-in" id="lexical-similarity-analysis">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" /> Similitud Léxica de Objetos (Análisis de Plantillas y Variaciones)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
            Agrupa contratos cuyos objetos tienen más del <span className="font-bold text-indigo-600 dark:text-indigo-400">80% de similitud léxica (coeficiente Jaccard)</span>. Esto revela el uso de plantillas de redacción idénticas donde solo cambia el nombre del supervisor, el lugar geográfico o leves conectores, permitiendo un análisis en profundidad de redacciones sospechosamente análogas.
          </p>
        </div>

        {isCalculatingSimilar && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold shrink-0 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Procesando en segundo plano...</span>
          </div>
        )}
      </div>

      {similarObjectsGroups.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
          {isCalculatingSimilar ? (
            <div className="flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <span>Analizando coincidencias léxicas en la matriz contractual...</span>
            </div>
          ) : (
            'No se identificaron patrones de similitud léxica u objetos sospechosos en este rango.'
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {similarObjectsGroups.map((group, index) => {
            return (
              <div 
                key={group.representativeObject} 
                className="p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-3xs transition-all rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-950/20"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-550 font-bold">Patrón #{index + 1}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-350 border border-indigo-100 dark:border-indigo-900/60 rounded text-[9px] font-extrabold font-mono">
                      {group.count} contratos vinculados
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold font-mono">
                      {group.uniqueObjects.length} redactores/variaciones
                    </span>
                  </div>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-relaxed italic pr-2 truncate font-sans">
                    &ldquo;{group.representativeObject}&rdquo;
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 text-right">
                  <div className="text-left sm:text-right">
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-[9px] block uppercase tracking-wider">Monto total agrupado</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono text-xs">{formatCOP(group.totalValue)}</span>
                  </div>
                  <button
                    onClick={() => setSelectedSimilarGroup(group)}
                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1 shrink-0 font-sans"
                  >
                    Auditar Léxico
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
