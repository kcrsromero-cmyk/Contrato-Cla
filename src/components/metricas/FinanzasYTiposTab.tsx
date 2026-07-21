import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Info } from 'lucide-react';
import { formatCOP, maskDocument } from './utils';
import { ContractorAggregate } from './types';

// Custom reusable tooltip component
function InfoTooltip({ content }: { content: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <span 
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      className="relative inline-block ml-1.5 align-middle cursor-help text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-20"
    >
      <Info className="w-3.5 h-3.5" />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-slate-950 dark:bg-slate-800 text-white dark:text-slate-100 text-[11px] leading-relaxed rounded-xl shadow-xl border border-slate-800 dark:border-slate-750 pointer-events-none text-left font-normal normal-case whitespace-normal z-30">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950 dark:border-t-slate-800"></span>
        </span>
      )}
    </span>
  );
}

interface FinanzasYTiposTabProps {
  topContractors: ContractorAggregate[];
  typeData: { name: string; value: number }[];
  limiteContratistas: number;
  setLimiteContratistas: (val: number) => void;
  chartType: 'donut' | 'bar-horizontal' | 'bar-vertical';
  setChartType: (val: 'donut' | 'bar-horizontal' | 'bar-vertical') => void;
  setSelectedTopContractor: (cont: ContractorAggregate) => void;
  allContractorsCount: number;
}

const VibrantColors = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', 
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6', 
  '#059669', '#d97706'
];

export const FinanzasYTiposTab: React.FC<FinanzasYTiposTabProps> = ({
  topContractors,
  typeData,
  limiteContratistas,
  setLimiteContratistas,
  chartType,
  setChartType,
  setSelectedTopContractor,
  allContractorsCount
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="finanzas-tipos-tab">
      
      {/* Top Contractors list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:col-span-2 flex flex-col h-[520px] shadow-xs overflow-hidden">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider">
              Top {limiteContratistas} Contratistas por Monto
              <InfoTooltip content="Muestra los proveedores adjudicados con el mayor valor acumulado contratado en el periodo de tiempo analizado." />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">Personas y empresas con mayor valor acumulado contratado.</p>
          </div>
          
          {/* Control deslizante (Slider) */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shrink-0">
            <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Mostrar: <span className="text-indigo-600 dark:text-indigo-450 font-extrabold">{limiteContratistas}</span>
            </span>
            <input 
              type="range"
              min="5"
              max="20"
              step="1"
              value={limiteContratistas}
              onChange={(e) => setLimiteContratistas(Number(e.target.value))}
              className="w-24 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-hidden"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {topContractors.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-mono">
              Sin datos de contratistas en este periodo.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-2">
              {topContractors.map((cont, idx) => {
                const maxVal = topContractors[0].valorTotal || 1;
                const ratio = ((cont.valorTotal / maxVal) * 100).toFixed(0);
                
                return (
                  <div 
                    key={`${cont.nombre}_${cont.documento}`} 
                    className="pt-3 pb-2 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2.5 py-2 rounded-xl transition-all border border-transparent hover:border-slate-100/80 dark:hover:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-4 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          #{idx + 1} {cont.nombre}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{cont.tipoDoc || 'NIT/CC'}: {maskDocument(cont.documento, cont.tipoDoc)}</span>
                          <span>•</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded">{cont.totalContratos} {cont.totalContratos === 1 ? 'contrato' : 'contratos'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        <div className="font-extrabold text-slate-950 dark:text-slate-50 font-mono">{formatCOP(cont.valorTotal)}</div>
                        <button
                          onClick={() => setSelectedTopContractor(cont)}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-white bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900 hover:border-indigo-600 transition-all flex items-center gap-0.5 cursor-pointer shadow-3xs"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                    
                    {/* Visual progress ratio bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full">
                      <div 
                        className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" 
                        style={{ width: `${ratio}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contract type donut chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col h-[520px] shadow-xs overflow-hidden">
        <div className="mb-4 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider truncate">
              Tipos de Contrato
              <InfoTooltip content="Clasifica los procesos contractuales de acuerdo con el tipo de prestación (Prestación de Servicios, Suministros, Obra Pública, etc.)." />
            </h3>
            
            {/* Selector de tipo de gráfico */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono shrink-0">
              <button
                onClick={() => setChartType('donut')}
                className={`px-2 py-0.5 rounded-md transition-all font-bold cursor-pointer ${
                  chartType === 'donut' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Gráfico de Dona"
              >
                Dona
              </button>
              <button
                onClick={() => setChartType('bar-horizontal')}
                className={`px-2 py-0.5 rounded-md transition-all font-bold cursor-pointer ${
                  chartType === 'bar-horizontal' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Barras Horizontales"
              >
                Horiz.
              </button>
              <button
                onClick={() => setChartType('bar-vertical')}
                className={`px-2 py-0.5 rounded-md transition-all font-bold cursor-pointer ${
                  chartType === 'bar-vertical' 
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-3xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Vert."
              >
                Vert.
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">Distribución por cantidad de registros según su tipología de objeto.</p>
        </div>
        
        {typeData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-mono">
            Sin datos de tipos de contrato
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Responsive Chart */}
            <div className="h-44 w-full shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'donut' ? (
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={VibrantColors[index % VibrantColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} contratos`} />
                  </PieChart>
                ) : chartType === 'bar-horizontal' ? (
                  <BarChart
                    layout="vertical"
                    data={typeData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={20} tick={false} />
                    <Tooltip formatter={(value) => `${value} contratos`} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={VibrantColors[index % VibrantColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart
                    data={typeData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  >
                    <XAxis dataKey="name" tick={false} />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} contratos`} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={VibrantColors[index % VibrantColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Legend with values - Fixed height to force vertical scrollbar */}
            <div className="h-[210px] overflow-y-auto pr-1.5 space-y-1.5 mt-3 custom-scrollbar text-xs scrollbar-thin scrollbar-thumb-slate-200">
              {typeData.map((item, index) => {
                const total = typeData.reduce((acc, c) => acc + c.value, 0);
                const percent = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/25 px-1 rounded transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: VibrantColors[index % VibrantColors.length] }}
                      ></div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate font-sans" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      {item.value} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
