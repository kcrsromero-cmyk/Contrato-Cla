import React, { useState, useMemo } from 'react';
import { getSafeSecopUrl } from '../utils/safeUrl';
import { Contrato } from '../types';
import { formatCOP, formatNumber, normalizeName, formatDate } from '../utils/helpers';
import ContractDetailModal from './ContractDetailModal';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  FolderGit2, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Eye,
  Building,
  UserCheck,
  RefreshCw,
  X,
  Info,
  Calendar,
  DollarSign,
  Scale,
  User,
  FileText
} from 'lucide-react';

// Safe external URL parser for Socrata schema variants
const getSecopUrl = (contrato: Contrato) => {
  return getSafeSecopUrl(contrato.urlproceso);
};

interface SupervisoresViewProps {
  contratos: Contrato[];
}

interface SupervisorAggregate {
  nombre: string;
  totalContratos: number;
  valorContratado: number;
  valorPagado: number;
  contratosModificados: number;
  contratosConAdicion: number;
  contratosLista: Contrato[];
}

export default function SupervisoresView({ contratos }: SupervisoresViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorAggregate | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Todos');
  const [selectedDetailContract, setSelectedDetailContract] = useState<Contrato | null>(null);
  const [isSupervisorDetailModalOpen, setIsSupervisorDetailModalOpen] = useState(false);

  // 1. Group and aggregate contracts by supervisor
  const supervisoresList = useMemo(() => {
    const map: { [key: string]: SupervisorAggregate } = {};

    contratos.forEach(c => {
      const supervisorRaw = c.nombre_supervisor?.trim() || 'No especificado';
      // Normalize supervisor key for grouping
      const key = supervisorRaw.toUpperCase();

      if (!map[key]) {
        map[key] = {
          nombre: supervisorRaw !== 'No especificado' ? normalizeName(supervisorRaw) : 'No especificado',
          totalContratos: 0,
          valorContratado: 0,
          valorPagado: 0,
          contratosModificados: 0,
          contratosConAdicion: 0,
          contratosLista: []
        };
      }

      const agg = map[key];
      agg.totalContratos += 1;
      agg.valorContratado += Number(c.valor_del_contrato) || 0;
      agg.valorPagado += Number(c.valor_pagado) || 0;
      
      if (c.estado_contrato?.toLowerCase().includes('modificado')) {
        agg.contratosModificados += 1;
      }
      if ((Number(c.dias_adicionados) || 0) > 0) {
        agg.contratosConAdicion += 1;
      }

      agg.contratosLista.push(c);
    });

    return Object.values(map).sort((a, b) => b.valorContratado - a.valorContratado);
  }, [contratos]);

  // 2. Filter supervisor list based on search term (Autocomplete style with local instant results)
  const filteredSupervisores = useMemo(() => {
    if (searchTerm.trim() === '') return supervisoresList;
    const term = searchTerm.toLowerCase();
    return supervisoresList.filter(s => s.nombre.toLowerCase().includes(term));
  }, [supervisoresList, searchTerm]);

  // 3. Dynamic contract statuses for selected supervisor
  const availableStatuses = useMemo(() => {
    if (!selectedSupervisor) return [];
    const statuses = new Set<string>();
    selectedSupervisor.contratosLista.forEach(c => {
      if (c.estado_contrato) {
        statuses.add(c.estado_contrato);
      }
    });
    return ['Todos', ...Array.from(statuses).sort()];
  }, [selectedSupervisor]);

  // 4. Filter selected supervisor's contracts by status
  const filteredContractsForSupervisor = useMemo(() => {
    if (!selectedSupervisor) return [];
    if (selectedStatusFilter === 'Todos') return selectedSupervisor.contratosLista;
    return selectedSupervisor.contratosLista.filter(c => c.estado_contrato === selectedStatusFilter);
  }, [selectedSupervisor, selectedStatusFilter]);

  const handleSelectSupervisor = (sup: SupervisorAggregate) => {
    setSelectedSupervisor(sup);
    setSelectedStatusFilter('Todos');
    setIsSupervisorDetailModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="supervisores-section">
      
      {/* Explicación de la vista */}
      <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-xs">
        <UserCheck className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-450 mt-0.5" />
        <div className="space-y-1.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase font-mono tracking-wider">Supervisores reportados en los contratos</span>
          <p className="leading-relaxed">
            Esta vista organiza los contratos según el nombre del supervisor reportado en los registros públicos de SECOP II. Permite consultar la cantidad de contratos, los valores contractuales registrados, los estados y otros datos asociados a cada nombre dentro de la entidad y el periodo seleccionados.
          </p>
          <p className="leading-relaxed font-semibold text-slate-700 dark:text-slate-300">
            La información se presenta con fines de consulta y seguimiento ciudadano. La asignación, funciones, responsabilidades, cambios de supervisor y soportes de supervisión deben verificarse en el expediente y en los documentos oficiales de cada proceso.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left column: List and Autocomplete search of supervisors */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 lg:col-span-1 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase font-mono tracking-wider">
                Supervisores ({filteredSupervisores.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">Búsqueda de supervisores</p>
            </div>
            {(searchTerm || selectedSupervisor || selectedStatusFilter !== 'Todos') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSupervisor(null);
                  setSelectedStatusFilter('Todos');
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                title="Restablecer todos los filtros de supervisores"
              >
                <RefreshCw className="w-3 h-3 text-indigo-600 dark:text-indigo-450" /> Restablecer
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar supervisor (mín. 3 letras)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-800 dark:text-slate-100"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredSupervisores.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-400 dark:text-slate-500">
                Ningún supervisor coincide
              </div>
            ) : (
              filteredSupervisores.map((sup) => {
                const isSelected = selectedSupervisor?.nombre === sup.nombre;
                return (
                  <button
                    key={sup.nombre}
                    onClick={() => handleSelectSupervisor(sup)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-650 dark:border-indigo-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate">{sup.nombre}</div>
                      <div className={`flex items-center gap-3 text-[10px] font-mono mt-1 ${isSelected ? 'text-indigo-100 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        <span>{sup.totalContratos} {sup.totalContratos === 1 ? 'contrato' : 'contratos'}</span>
                        <span>•</span>
                        <span>{formatCOP(sup.valorContratado)}</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Detailed breakdown of the selected supervisor */}
        <div className="lg:col-span-2">
          {!selectedSupervisor ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center py-24 flex flex-col items-center justify-center shadow-xs">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-750 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Seleccione un supervisor</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                Elija un supervisor de la lista de la izquierda para desplegar el seguimiento de plazos y el detalle de contratos asociados.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in shadow-xs">
              
              {/* Supervisor Header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Supervisor reportado</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{selectedSupervisor.nombre}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                    Asociado a la supervisión técnica y administrativa de los siguientes contratos en los datos disponibles.
                  </p>
                </div>
                <button
                  onClick={() => setIsSupervisorDetailModalOpen(true)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs rounded-xl shrink-0 bg-white dark:bg-slate-900 font-sans"
                >
                  <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Ver Ficha de Detalle
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Contratos</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{selectedSupervisor.totalContratos}</div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Monto Total</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1.5 truncate" title={formatCOP(selectedSupervisor.valorContratado)}>
                    {formatCOP(selectedSupervisor.valorContratado)}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Pagado</div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 truncate" title={formatCOP(selectedSupervisor.valorPagado)}>
                    {formatCOP(selectedSupervisor.valorPagado)}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Modificados</div>
                  <div className={`text-lg font-bold mt-1 ${selectedSupervisor.contratosModificados > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {selectedSupervisor.contratosModificados}
                  </div>
                </div>
              </div>

              {/* Warnings and plazos modifications metrics */}
              {selectedSupervisor.contratosConAdicion > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex gap-2 shadow-2xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-450 mt-0.5" />
                  <div>
                    <span className="font-semibold">Plazos adicionados:</span> Este supervisor tiene <span className="font-bold">{selectedSupervisor.contratosConAdicion}</span> contrato(s) con prórroga o ampliación de plazo reportada. Las ampliaciones son herramientas legales legítimas pero de interés para el control ciudadano, ya que retrasan el cronograma pactado inicialmente.
                  </div>
                </div>
              )}

              {/* List of contracts supervised */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Contratos bajo su cargo ({selectedSupervisor.totalContratos})
                  </h4>
                  {selectedStatusFilter !== 'Todos' && (
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2 py-0.5 rounded-full font-mono">
                      Filtrado por: {selectedStatusFilter} ({filteredContractsForSupervisor.length})
                    </span>
                  )}
                </div>

                {/* Filtros dinámicos de estado */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-850 rounded-xl">
                  <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">Filtrar por Estado Contractual:</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {availableStatuses.map(status => {
                      const isActive = selectedStatusFilter === status;
                      const count = status === 'Todos' 
                        ? selectedSupervisor.contratosLista.length 
                        : selectedSupervisor.contratosLista.filter(c => c.estado_contrato === status).length;
                      
                      return (
                        <button
                          key={status}
                          onClick={() => setSelectedStatusFilter(status)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {status} <span className={`ml-0.5 text-[10px] font-mono ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredContractsForSupervisor.length === 0 ? (
                    <div className="py-12 text-center text-xs font-mono text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                      Ningún contrato coincide con el estado seleccionado
                    </div>
                  ) : (
                    filteredContractsForSupervisor.map((c, sIdx) => {
                      const secopUrl = getSafeSecopUrl(c.urlproceso);
                      return (
                        <div 
                          key={c.id_contrato} 
                          className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 space-y-2 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-2xs transition-all shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-450">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              #{sIdx + 1} de {filteredContractsForSupervisor.length}
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-2 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded">ID: {c.id_contrato}</span>
                              {c.referencia_del_contrato && (
                                <span className="font-mono text-[10px] text-indigo-700 dark:text-indigo-300 font-bold ml-1.5 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                                  Ref: {c.referencia_del_contrato}
                                </span>
                              )}
                            </span>
                            <span>Firma: {formatDate(c.fecha_de_firma)}</span>
                          </div>
                        
                        <div>
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            Contratista: {normalizeName(c.proveedor_adjudicado)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            Objeto: {c.objeto_del_contrato}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-850 text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatCOP(c.valor_del_contrato)}
                          </span>
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                              {c.estado_contrato}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedDetailContract(c)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                            >
                              <Eye className="w-3 h-3" /> Detalle
                            </button>
                            {secopUrl && (
                              <a
                                href={secopUrl}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center gap-0.5 font-bold cursor-pointer"
                              >
                                SECOP <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Detailed Contract Quick-View Modal */}
      {selectedDetailContract && (
        <ContractDetailModal
          contract={selectedDetailContract}
          onClose={() => setSelectedDetailContract(null)}
        />
      )}

      {/* Supervisor Comprehensive Detail Modal */}
      {isSupervisorDetailModalOpen && selectedSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative animate-scale-up" id="supervisor-detail-modal-root">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
              <div className="min-w-0 pr-6">
                <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Ficha de Detalle e Historial de Supervisor</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate font-sans">
                  {selectedSupervisor.nombre}
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-450 mt-0.5">
                  Resumen de contratos reportados y control ciudadano
                </p>
              </div>
              <button 
                onClick={() => setIsSupervisorDetailModalOpen(false)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-550 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Info alert */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/35 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-2xs">
                <Info className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-indigo-950 dark:text-indigo-350 block text-xs uppercase font-mono tracking-wider">Acerca de la supervisión registrada</span>
                  <p className="leading-relaxed">
                    Esta ficha consolida las cifras y el listado de contratos en los que figura el nombre del supervisor dentro de los registros procesados. Un supervisor vigila el cumplimiento contractual de acuerdo con las leyes vigentes de contratación en Colombia.
                  </p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-2xs text-center">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Contratos</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{selectedSupervisor.totalContratos}</div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-2xs text-center">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Monto Total</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1.5 truncate" title={formatCOP(selectedSupervisor.valorContratado)}>
                    {formatCOP(selectedSupervisor.valorContratado)}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-2xs text-center">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Pagado</div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1.5 truncate" title={formatCOP(selectedSupervisor.valorPagado)}>
                    {formatCOP(selectedSupervisor.valorPagado)}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-2xs text-center">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Modificados</div>
                  <div className={`text-xl font-bold mt-1 ${selectedSupervisor.contratosModificados > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {selectedSupervisor.contratosModificados}
                  </div>
                </div>
              </div>

              {/* Warnings and plazos modifications metrics inside modal */}
              {selectedSupervisor.contratosConAdicion > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex gap-2 shadow-2xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-450 mt-0.5" />
                  <div>
                    <span className="font-semibold">Plazos adicionados:</span> Este supervisor tiene <span className="font-bold">{selectedSupervisor.contratosConAdicion}</span> contrato(s) con prórroga o ampliación de plazo reportada.
                  </div>
                </div>
              )}

              {/* Table / List of contracts overseen */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Relación Completa de Contratos Supervisados
                </h4>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedSupervisor.contratosLista.map((c, sIdx) => {
                    const secopUrl = getSecopUrl(c);
                    return (
                      <div 
                        key={c.id_contrato} 
                        className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950/30 space-y-2 hover:border-indigo-600 dark:hover:border-indigo-500 transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-455">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            #{sIdx + 1} de {selectedSupervisor.totalContratos}
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-normal ml-2 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded">ID: {c.id_contrato}</span>
                          </span>
                          <span>Firma: {formatDate(c.fecha_de_firma)}</span>
                        </div>
                      
                        <div>
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            Contratista: {normalizeName(c.proveedor_adjudicado)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Objeto: <span className="text-slate-600 dark:text-slate-300 font-sans">{c.objeto_del_contrato}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-850 text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatCOP(c.valor_del_contrato)}
                          </span>
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[9px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                              {c.estado_contrato}
                            </span>
                            {secopUrl && (
                              <a
                                href={secopUrl}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center gap-0.5 font-bold cursor-pointer text-[10px]"
                              >
                                SECOP <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3 sticky bottom-0 z-10 rounded-b-2xl">
              <button
                onClick={() => setIsSupervisorDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900"
              >
                Cerrar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
