import React from 'react';
import { BadgeAlert, ChevronRight, Info } from 'lucide-react';
import { CitizenIndicator } from './types';
import { Contrato } from '../../types';
import { formatNumber } from '../../utils/helpers';

interface AlertasYPlazosTabProps {
  citizenIndicators: CitizenIndicator[];
  setSelectedIndicatorList: (data: { label: string; list: Contrato[] }) => void;
}

export const AlertasYPlazosTab: React.FC<AlertasYPlazosTabProps> = ({
  citizenIndicators,
  setSelectedIndicatorList,
}) => {
  return (
    <div className="space-y-4 animate-fade-in" id="alertas-plazos-analysis">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider">
          Indicadores de consulta y comparación
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
          Métricas descriptivas para el seguimiento de plazos, adiciones, saldos registrados y estado de ejecución. Haga clic en <span className="font-bold">"Ver Contratos"</span> para abrir el listado de registros.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {citizenIndicators.map((indicator) => {
          return (
            <div 
              key={indicator.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-600 dark:hover:border-indigo-450 hover:shadow-sm transition-all flex flex-col justify-between shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-extrabold tracking-wider ${
                    indicator.warningLevel === 'high' 
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/65'
                      : indicator.warningLevel === 'medium'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/60'
                      : 'bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}>
                    Riesgo: {indicator.warningLevel}
                  </span>
                  <BadgeAlert className={`w-4 h-4 ${
                    indicator.warningLevel === 'high' ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-slate-400'
                  }`} />
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm font-sans">{indicator.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium font-sans">{indicator.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Ocurrencias</div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">{formatNumber(indicator.count)}</div>
                  </div>
                  {indicator.value && (
                    <div className="text-right">
                      <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Monto Afectado</div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mt-1 font-mono">{indicator.value}</div>
                    </div>
                  )}
                </div>

                {/* Neutral insight text */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-850 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 leading-normal flex gap-1.5 items-start">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span className="font-medium font-sans">{indicator.insight}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedIndicatorList({ label: indicator.title, list: indicator.contracts })}
                  disabled={indicator.count === 0}
                  className="w-full text-center py-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs bg-white dark:bg-slate-900 font-sans"
                >
                  Ver Contratos Detallados <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
