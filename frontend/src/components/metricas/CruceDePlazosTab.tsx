import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { MultiContractorAggregate } from './types';
import { formatCOP, maskDocument } from './utils';

interface CruceDePlazosTabProps {
  multiContractors: MultiContractorAggregate[];
  setSelectedMultiContractor: (cont: MultiContractorAggregate) => void;
}

export const CruceDePlazosTab: React.FC<CruceDePlazosTabProps> = ({
  multiContractors,
  setSelectedMultiContractor,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs animate-fade-in" id="multi-contractors-civic-audit">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" /> Top Contratistas con Múltiples Contratos (Control de Simultaneidad)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
          Muestra el listado de contratistas que han firmado <span className="font-bold">más de 1 contrato</span> en el mismo periodo de tiempo. Haga clic en <span className="font-bold text-indigo-600 dark:text-indigo-400">"Auditar Simultaneidad"</span> para evaluar si se solaparon o cruzaron los plazos de ejecución de forma simultánea, detectando posibles incompatibilidades operativas.
        </p>
      </div>

      {multiContractors.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
          Ningún contratista cuenta con más de un contrato en este periodo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {multiContractors.slice(0, 15).map((cont, idx) => {
            return (
              <div 
                key={`${cont.nombre}_${cont.documento}_multi`}
                className="p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-550 hover:shadow-2xs transition-all rounded-xl bg-slate-50/30 dark:bg-slate-950/20 flex flex-col justify-between gap-3 shadow-3xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">Ránking #{idx + 1}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 rounded text-[10px] font-extrabold font-mono">
                      {cont.totalContratos} contratos
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate" title={cont.nombre}>
                      {cont.nombre}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {cont.tipoDoc}: {maskDocument(cont.documento, cont.tipoDoc)}
                    </p>
                  </div>
                  <div className="text-xs pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 dark:text-slate-500 font-mono text-[9px] uppercase">Monto Total:</span>
                    <span className="font-bold text-slate-950 dark:text-slate-50 font-mono text-xs">{formatCOP(cont.valorTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMultiContractor(cont)}
                  className="w-full text-center py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/5 dark:hover:bg-indigo-950/30 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center gap-1 shadow-3xs cursor-pointer font-sans"
                >
                  Auditar Simultaneidad <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
