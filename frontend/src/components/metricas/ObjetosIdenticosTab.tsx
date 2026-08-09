import React from 'react';
import { BadgeAlert, ClipboardList } from 'lucide-react';
import { RepeatedObjectGroup } from './types';
import { formatCOP } from './utils';

interface ObjetosIdenticosTabProps {
  repeatedObjects: RepeatedObjectGroup[];
  setSelectedRepeatedGroup: (group: RepeatedObjectGroup) => void;
}

export const ObjetosIdenticosTab: React.FC<ObjetosIdenticosTabProps> = ({
  repeatedObjects,
  setSelectedRepeatedGroup,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs animate-fade-in" id="exact-objects-repetition-analysis">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider flex items-center gap-1.5">
          <BadgeAlert className="w-4 h-4 text-rose-600 dark:text-rose-450 animate-pulse" /> Objetos Contractuales Idénticos (Análisis de Duplicidades)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
          Identifica grupos de contratos que comparten exactamente el mismo objeto contractual (concordancia literal, letra por letra). Útil para verificar si se están fraccionando compras, contratando tareas idénticas mediante múltiples procesos, o si existen adjudicaciones reiterativas.
        </p>
      </div>

      {repeatedObjects.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
          No se encontraron objetos contractuales idénticos repetidos en la base de datos de contratos analizada.
        </div>
      ) : (
        <div className="space-y-3">
          {repeatedObjects.map((group, index) => {
            return (
              <div 
                key={group.normalizedObject} 
                className="p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-3xs transition-all rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-950/20"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-550 font-bold">Grupo #{index + 1}</span>
                    <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-350 border border-rose-100 dark:border-rose-900/60 rounded text-[9px] font-extrabold font-mono flex items-center gap-1">
                      <ClipboardList className="w-3 h-3 text-rose-500 dark:text-rose-400" /> {group.count} contratos idénticos
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold font-mono">
                      {group.contractors.length} contratistas únicos
                    </span>
                  </div>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-relaxed italic pr-2 truncate font-sans">
                    &ldquo;{group.originalObject}&rdquo;
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 text-right">
                  <div className="text-left sm:text-right">
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-[9px] block uppercase tracking-wider">Valor total acumulado</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono text-xs">{formatCOP(group.totalValue)}</span>
                  </div>
                  <button
                    onClick={() => setSelectedRepeatedGroup(group)}
                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1 shrink-0 font-sans"
                  >
                    Comparar Contratos
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
