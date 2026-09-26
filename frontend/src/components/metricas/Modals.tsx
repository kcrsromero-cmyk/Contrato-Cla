import React, { useState } from 'react';
import { getSafeSecopUrl } from '../../utils/safeUrl';
import { X, Info, ShieldAlert, CheckCircle2, ExternalLink, Coins, Sparkles, BadgeAlert, CopyCheck, FileStack, Clock } from 'lucide-react';
import { Contrato } from '../../types';
import { ContractorAggregate, MultiContractorAggregate, RepeatedObjectGroup, SimilarObjectGroup } from './types';
import { maskDocument, renderEstadoSemaforo, renderContratoBadge, checkOverlaps, analyzeLexicalVariations } from './utils';
import { formatCOP, formatDate, normalizeName } from '../../utils/helpers';

// 1. Top Contractor Detail Modal
interface TopContractorModalProps {
  selectedTopContractor: ContractorAggregate | null;
  onClose: () => void;
}

export const TopContractorModal: React.FC<TopContractorModalProps> = ({
  selectedTopContractor,
  onClose,
}) => {
  if (!selectedTopContractor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative animate-scale-up" id="top-contractor-detail-modal">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
          <div className="min-w-0 pr-6">
            <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-450" /> Desglose Detallado de Contratos
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans leading-relaxed">
              {selectedTopContractor.nombre}
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              {selectedTopContractor.tipoDoc}: <span className="font-semibold text-slate-700 dark:text-slate-300">{maskDocument(selectedTopContractor.documento, selectedTopContractor.tipoDoc)}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Información de consulta ciudadana */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase font-mono tracking-wider">Información de consulta ciudadana</span>
              <p className="leading-relaxed font-sans">
                Este resultado se calcula a partir de los datos públicos disponibles en SECOP II. Es descriptivo y no constituye una conclusión sobre legalidad, cumplimiento, responsabilidad o irregularidad. Consulte el expediente oficial de cada contrato para ampliar la información.
              </p>
            </div>
          </div>

          {/* Stats overview banner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl flex flex-col justify-center">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contratos Totales</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{selectedTopContractor.totalContratos}</div>
            </div>
            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/60 rounded-xl flex flex-col justify-center">
              <div className="text-[10px] font-bold font-mono text-indigo-500 dark:text-indigo-450 uppercase tracking-widest">Monto Acumulado</div>
              <div className="text-lg font-extrabold text-indigo-950 dark:text-indigo-205 font-mono mt-0.5">{formatCOP(selectedTopContractor.valorTotal)}</div>
            </div>
          </div>

          {/* List of Contracts */}
          <div className="space-y-4">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Contratos Adjudicados:</div>
            
            {selectedTopContractor.contratos.map((c: Contrato, cIdx: number) => {
              const secopUrl = getSafeSecopUrl(c.urlproceso);
              return (
                <div 
                  key={c.id_contrato} 
                  className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-950/20 hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-900 transition-all rounded-xl space-y-3 shadow-3xs"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/60 dark:border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      {renderContratoBadge(cIdx)}
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">ID: {c.id_contrato}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold border font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/60">
                      {c.modalidad_de_contratacion || 'No especificada'}
                    </span>
                  </div>

                  {/* Objeto de contrato */}
                  <div className="text-xs">
                    <span className="font-bold text-slate-500 dark:text-slate-400 block mb-1">Objeto del Contrato:</span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium italic bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100/80 dark:border-slate-850">
                      &ldquo;{c.objeto_del_contrato || 'Sin objeto registrado'}&rdquo;
                    </p>
                  </div>

                  {/* Card Body Grid */}
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono block uppercase font-bold">Fecha Firma</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_firma)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono block uppercase font-bold">Fecha Fin</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_fin_del_contrato)}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 dark:text-slate-500 font-mono block uppercase font-bold">Valor Contrato</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 font-sans">{formatCOP(c.valor_del_contrato)}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-[11px] flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100/40 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 dark:text-slate-500 font-mono uppercase">Estado:</span>{' '}
                        {renderEstadoSemaforo(c.estado_contrato)}
                      </div>
                      {c.tipo_de_contrato && (
                        <div>
                          • <span className="text-slate-400 dark:text-slate-500 font-mono uppercase">Tipo:</span>{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{c.tipo_de_contrato}</span>
                        </div>
                      )}
                      {c.nombre_supervisor && (
                        <div>
                          • <span className="text-slate-400 dark:text-slate-500 font-mono uppercase">Supervisor:</span>{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{normalizeName(c.nombre_supervisor)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expediente link */}
                  {secopUrl && (
                    <div className="flex justify-end pt-1">
                      <a
                        href={secopUrl}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 cursor-pointer hover:underline font-sans"
                      >
                        Ver Expediente SECOP <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900 font-sans"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};


// 2. Multi Contractor Audit Modal (Simultaneity)
interface MultiContractorAuditModalProps {
  selectedMultiContractor: MultiContractorAggregate | null;
  onClose: () => void;
}

export const MultiContractorAuditModal: React.FC<MultiContractorAuditModalProps> = ({
  selectedMultiContractor,
  onClose,
}) => {
  if (!selectedMultiContractor) return null;

  const overlapsMap = checkOverlaps(selectedMultiContractor.contratos);
  const hasOverlaps = Object.keys(overlapsMap).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative" id="multi-contractor-audit-modal">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
          <div className="min-w-0 pr-6">
            <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Auditoría Cívica de Simultaneidad de Plazos
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans leading-relaxed">
              Contratista: {selectedMultiContractor.nombre}
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              {selectedMultiContractor.tipoDoc}: <span className="font-semibold text-slate-700 dark:text-slate-300">{maskDocument(selectedMultiContractor.documento, selectedMultiContractor.tipoDoc)}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase font-mono tracking-wider">Metodología de cruce temporal</span>
              <p className="leading-relaxed font-sans">
                Este análisis compara las fechas oficiales de inicio y terminación reportadas por la entidad compradora en SECOP II. El algoritmo busca solapamientos totales o parciales en el tiempo entre los contratos adjudicados al contratista en esta vigencia.
              </p>
              <p className="leading-relaxed font-semibold text-slate-700 dark:text-slate-300 font-sans">
                Este cruce es únicamente indicativo e informativo. Para verificar si existieron incompatibilidades horarias o físicas, consulte las actas de inicio de cada proceso contractual y compare las obligaciones operativas de cada expediente de contratación.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl flex flex-col justify-center">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contratos del Periodo</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{selectedMultiContractor.totalContratos}</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl flex flex-col justify-center">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">Valor Acumulado</div>
              <div className="text-lg font-extrabold text-indigo-650 dark:text-indigo-400 font-mono mt-0.5">{formatCOP(selectedMultiContractor.valorTotal)}</div>
            </div>
          </div>

          {/* Alerta general de solapamiento */}
          <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 shadow-3xs ${
            hasOverlaps 
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300' 
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
          }`}>
            {hasOverlaps ? (
              <>
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-amber-950 dark:text-amber-250 font-sans">Se encontraron coincidencias de periodos registrados</span>
                  <p className="leading-relaxed font-medium font-sans">
                    Algunos contratos asociados a este contratista presentan fechas de inicio y finalización que coinciden total o parcialmente, según la información reportada en SECOP II.
                  </p>
                  <p className="leading-relaxed text-amber-900 dark:text-amber-400 text-[11px] font-sans">
                    Consulte el detalle de los contratos incluidos para revisar los periodos, objetos, valores, condiciones y documentos asociados a cada proceso.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-emerald-950 dark:text-emerald-250 font-sans">Sin coincidencias de periodos registradas</span>
                  <p className="leading-relaxed font-medium font-sans">
                    No se identificaron cruces entre las fechas de inicio y finalización reportadas para los contratos consultados en este periodo.
                  </p>
                  <p className="leading-relaxed text-emerald-800 dark:text-emerald-400 text-[11px] font-sans">
                    Este resultado se basa exclusivamente en las fechas disponibles en SECOP II y puede variar si existen actualizaciones, modificaciones, fechas no reportadas o registros incompletos.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Contracts Details list */}
          <div className="space-y-4">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Detalle de Contratos y Análisis de Cruces:</div>
            
            {selectedMultiContractor.contratos.map((c, cIdx) => {
              const secopUrl = getSafeSecopUrl(c.urlproceso);
              const cOverlaps = overlapsMap[c.id_contrato] || [];
              const isOverlapped = cOverlaps.length > 0;

              return (
                <div 
                  key={c.id_contrato} 
                  className={`p-4 border rounded-xl space-y-3 transition-all shadow-2xs bg-white dark:bg-slate-900 ${
                    isOverlapped 
                      ? 'border-amber-300 dark:border-amber-700/80 ring-1 ring-amber-200 dark:ring-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10' 
                      : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      {renderContratoBadge(cIdx)}
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">ID: {c.id_contrato}</span>
                    </div>
                    {renderEstadoSemaforo(c.estado_contrato)}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <div><span className="font-bold text-slate-500 dark:text-slate-400 font-sans">Objeto:</span> <span className="font-sans italic">{c.objeto_del_contrato}</span></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono block">FECHA INICIO</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_inicio_del_contrato)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono block">FECHA FIN</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_fin_del_contrato)}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 dark:text-slate-500 font-mono block">VALOR CONTRATO</span>
                        <span className="font-bold text-slate-900 dark:text-slate-101 font-sans">{formatCOP(c.valor_del_contrato)}</span>
                      </div>
                    </div>
                  </div>

                  {isOverlapped && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg text-[10px] text-amber-800 dark:text-amber-300 flex gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="font-sans">
                        Este contrato <span className="font-bold">coincide en el tiempo</span> con:{' '}
                        <span className="font-bold text-amber-950 dark:text-amber-200">
                          {cOverlaps.map(id => {
                            const otherIndex = selectedMultiContractor.contratos.findIndex(item => item.id_contrato === id);
                            return `Contrato #${otherIndex + 1}`;
                          }).join(', ')}
                        </span>.
                      </div>
                    </div>
                  )}

                  {secopUrl && (
                    <div className="flex justify-end pt-1">
                      <a
                        href={secopUrl}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 cursor-pointer font-sans"
                      >
                        Ver Expediente SECOP <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900 font-sans"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};


// 3. Repeated Group Audit Modal (Identical objects)
interface RepeatedGroupModalProps {
  selectedRepeatedGroup: RepeatedObjectGroup | null;
  onClose: () => void;
}

export const RepeatedGroupModal: React.FC<RepeatedGroupModalProps> = ({
  selectedRepeatedGroup,
  onClose,
}) => {
  if (!selectedRepeatedGroup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative" id="repeated-group-audit-modal">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
          <div className="min-w-0 pr-6">
            <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
              <BadgeAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Coincidencia de Objeto Contractual
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans leading-relaxed italic bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-850 shadow-2xs">
              &ldquo;{selectedRepeatedGroup.originalObject}&rdquo;
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-2">
              Se encontraron <span className="font-bold text-rose-600 dark:text-rose-400">{selectedRepeatedGroup.count} contratos</span> con este objeto exacto de contratación.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase font-mono tracking-wider">Nota de consulta y comparación</span>
              <p className="leading-relaxed font-sans">
                Compare las fechas de firma y los contratistas asociados en el listado inferior, según los datos disponibles reportados en SECOP II. Esta coincidencia registrada puede responder a necesidades de suministro continuo o servicios recurrentes de la entidad.
              </p>
              <p className="leading-relaxed font-semibold text-slate-700 dark:text-slate-300 font-sans">
                Este resultado descriptivo no permite determinar por sí solo la existencia de irregularidades. Para una interpretación completa, verifique los documentos oficiales y requiera la revisión del expediente oficial en los enlaces provistos.
              </p>
            </div>
          </div>

          {/* Accumulate stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest">Contratos Coincidentes</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{selectedRepeatedGroup.count}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest">Valor Acumulado</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{formatCOP(selectedRepeatedGroup.totalValue)}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest">Contratistas Únicos</div>
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{selectedRepeatedGroup.contractors.length}</div>
            </div>
          </div>

          {/* List of Contracts */}
          <div className="space-y-4">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Desglose de contratos identificados:</div>
            
            {selectedRepeatedGroup.contracts.map((c: Contrato, cIdx: number) => {
              const secopUrl = getSafeSecopUrl(c.urlproceso);
              return (
                <div 
                  key={c.id_contrato} 
                  className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all rounded-xl space-y-3 shadow-2xs bg-white dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      {renderContratoBadge(cIdx)}
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">ID: {c.id_contrato}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold border font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/60">
                      {c.modalidad_de_contratacion || 'No especificada'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="font-bold text-slate-500 dark:text-slate-400">Contratista:</span>{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{normalizeName(c.proveedor_adjudicado)}</span>{' '}
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">({maskDocument(c.documento_proveedor || '', c.tipodocproveedor)})</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono block">FECHA FIRMA</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_firma)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono block">FECHA FIN</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_fin_del_contrato)}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 dark:text-slate-500 font-mono block">VALOR CONTRATO</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 font-sans">{formatCOP(c.valor_del_contrato)}</span>
                      </div>
                    </div>
                    <div className="pt-1.5 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 dark:text-slate-500 font-mono">ESTADO:</span>{' '}
                        {renderEstadoSemaforo(c.estado_contrato)}
                      </div>
                      {c.nombre_supervisor && (
                        <div>
                          • <span className="text-slate-400 dark:text-slate-500 font-mono">SUPERVISOR:</span>{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{normalizeName(c.nombre_supervisor)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {secopUrl && (
                    <div className="flex justify-end pt-1">
                      <a
                        href={secopUrl}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 cursor-pointer font-sans"
                      >
                        Ver Expediente SECOP <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900 font-sans"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};


// 4. Similar Group Modal (Lexical similarity)
interface SimilarGroupModalProps {
  selectedSimilarGroup: SimilarObjectGroup | null;
  onClose: () => void;
}

export const SimilarGroupModal: React.FC<SimilarGroupModalProps> = ({
  selectedSimilarGroup,
  onClose,
}) => {
  const [similarModalTab, setSimilarModalTab] = useState<'analysis' | 'contracts'>('analysis');

  if (!selectedSimilarGroup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative" id="similar-group-comparison-modal">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
          <div className="min-w-0 pr-6">
            <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Coincidencia por Similitud de Objeto Contractual
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans leading-relaxed italic bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-850 shadow-2xs">
              &ldquo;{selectedSimilarGroup.representativeObject}&rdquo;
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-2">
              Se encontraron <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedSimilarGroup.count} contratos asociados</span> con objetos de alta similitud léxica.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase font-mono tracking-wider">Nota de consulta y comparación</span>
              <p className="leading-relaxed font-sans">
                Este resultado descriptivo agrupa contratos cuyos objetos tienen variaciones de redacción o un orden de palabras distinto, según los datos disponibles reportados en SECOP II. No permite determinar por sí solo la existencia de irregularidades.
              </p>
              <p className="leading-relaxed font-semibold text-slate-700 dark:text-slate-300 font-sans">
                Consulte el expediente oficial de cada proceso en SECOP para verificar los documentos oficiales y contrastar los alcances, justificaciones y condiciones de cada contrato.
              </p>
            </div>
          </div>

          {/* Accumulate stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest">Contratos Asociados</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{selectedSimilarGroup.count}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest">Monto Acumulado</div>
              <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">{formatCOP(selectedSimilarGroup.totalValue)}</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/85 rounded-xl col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest">Contratistas Asociados</div>
              <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{selectedSimilarGroup.uniqueContractors.length}</div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSimilarModalTab('analysis')}
              className={`flex-1 py-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                similarModalTab === 'analysis' 
                  ? 'border-indigo-600 dark:border-indigo-450 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5 dark:bg-indigo-950/5 font-extrabold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
              }`}
            >
              🔍 Análisis Léxico Comparativo ({analyzeLexicalVariations(selectedSimilarGroup.uniqueObjects).length} Hallazgos)
            </button>
            <button
              onClick={() => setSimilarModalTab('contracts')}
              className={`flex-1 py-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 text-center transition-all cursor-pointer ${
                similarModalTab === 'contracts' 
                  ? 'border-indigo-600 dark:border-indigo-450 text-indigo-600 dark:text-indigo-400 bg-indigo-50/5 dark:bg-indigo-950/5 font-extrabold' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
              }`}
            >
              📋 Contratos Asociados ({selectedSimilarGroup.count})
            </button>
          </div>

          {similarModalTab === 'analysis' ? (
            <div className="space-y-6 animate-fade-in">
              {/* List of Variations */}
              <div className="space-y-2">
                <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Variaciones de redacción identificadas:</div>
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 max-h-[150px] overflow-y-auto">
                  {selectedSimilarGroup.uniqueObjects.map((obj: string, oIdx: number) => (
                    <div key={oIdx} className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-2.5 rounded-lg shadow-3xs italic leading-relaxed font-sans">
                      &ldquo;{obj}&rdquo;
                    </div>
                  ))}
                </div>
              </div>

              {/* Lexical Discrepancies Details */}
              <div className="space-y-4">
                <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Análisis detallado de discrepancias léxicas:</div>
                
                {(() => {
                  const insights = analyzeLexicalVariations(selectedSimilarGroup.uniqueObjects);
                  if (insights.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs font-mono text-slate-400 dark:text-slate-550 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/20">
                        No se detectaron diferencias léxicas significativas entre los objetos de este grupo (son idénticos).
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {insights.map((insight, insIdx) => {
                        let cardStyles = "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20";
                        let badgeStyles = "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800";
                        let IconComponent = Info;

                        switch (insight.type) {
                          case 'ortografia':
                            cardStyles = "border-amber-200 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10";
                            badgeStyles = "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40";
                            IconComponent = CheckCircle2;
                            break;
                          case 'error_tipografico':
                            cardStyles = "border-rose-200 dark:border-rose-900/60 bg-rose-50/10 dark:bg-rose-950/10";
                            badgeStyles = "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40";
                            IconComponent = BadgeAlert;
                            break;
                          case 'termino_variable':
                            cardStyles = "border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/10 dark:bg-indigo-950/10";
                            badgeStyles = "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-900/40";
                            IconComponent = Sparkles;
                            break;
                          case 'conector':
                            cardStyles = "border-sky-200 dark:border-sky-900/60 bg-sky-50/10 dark:bg-sky-950/10";
                            badgeStyles = "bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200/60 dark:border-sky-900/40";
                            IconComponent = CopyCheck;
                            break;
                          case 'cierre_estructura':
                            cardStyles = "border-violet-200 dark:border-violet-900/60 bg-violet-50/10 dark:bg-violet-950/10";
                            badgeStyles = "bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-200/60 dark:border-violet-900/40";
                            IconComponent = FileStack;
                            break;
                          case 'puntuacion':
                            cardStyles = "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40";
                            badgeStyles = "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-800";
                            IconComponent = Clock;
                            break;
                        }

                        return (
                          <div key={insIdx} className={`p-4 border rounded-xl space-y-2.5 shadow-3xs transition-all ${cardStyles}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs uppercase font-mono tracking-wider">
                                <IconComponent className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                                {insight.title}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono border font-extrabold ${badgeStyles}`}>
                                {insight.type.toUpperCase()}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium font-sans">
                              {insight.description}
                            </p>

                            <div className="space-y-1 bg-white/65 dark:bg-slate-900/65 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850 shadow-3xs">
                              <div className="text-[9px] font-bold font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1">Evidencias encontradas:</div>
                              <ul className="space-y-1">
                                {insight.examples.map((ex, exIdx) => (
                                  <li key={exIdx} className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 flex flex-col gap-0.5 font-sans">
                                    <span className="font-semibold italic text-slate-900 dark:text-slate-100">{ex.original}</span>
                                    {ex.details && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-450 font-mono">({ex.details})</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-550">Desglose de contratos incluidos:</div>
              
              {selectedSimilarGroup.contracts.map((c: Contrato, cIdx: number) => {
                const secopUrl = getSafeSecopUrl(c.urlproceso);
                return (
                  <div 
                    key={c.id_contrato} 
                    className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all rounded-xl space-y-3 shadow-2xs bg-white dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2">
                      <div className="flex items-center gap-2">
                        {renderContratoBadge(cIdx)}
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">ID: {c.id_contrato}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold border font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/60">
                        {c.modalidad_de_contratacion || 'No especificada'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/50 p-2 rounded-md border border-slate-100 dark:border-slate-850 leading-relaxed mb-2">
                        &ldquo;{c.objeto_del_contrato}&rdquo;
                      </div>
                      <div>
                        <span className="font-bold text-slate-500 dark:text-slate-400">Contratista:</span>{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{normalizeName(c.proveedor_adjudicado)}</span>{' '}
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">({maskDocument(c.documento_proveedor || '', c.tipodocproveedor)})</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 font-mono block">FECHA FIRMA</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_firma)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 font-mono block">FECHA FIN</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_fin_del_contrato)}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-slate-400 dark:text-slate-500 font-mono block">VALOR CONTRATO</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 font-sans">{formatCOP(c.valor_del_contrato)}</span>
                        </div>
                      </div>
                      <div className="pt-1.5 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 dark:text-slate-500 font-mono">ESTADO:</span>{' '}
                          {renderEstadoSemaforo(c.estado_contrato)}
                        </div>
                        {c.nombre_supervisor && (
                          <div>
                            • <span className="text-slate-400 dark:text-slate-500 font-mono">SUPERVISOR:</span>{' '}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{normalizeName(c.nombre_supervisor)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {secopUrl && (
                      <div className="flex justify-end pt-1">
                        <a
                          href={secopUrl}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 cursor-pointer font-sans"
                        >
                          Ver Expediente SECOP <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900 font-sans"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};


// 5. Indicator List Modal (Detail view for single indicator)
interface IndicatorListModalProps {
  selectedIndicatorList: { label: string; list: Contrato[] } | null;
  onClose: () => void;
}

export const IndicatorListModal: React.FC<IndicatorListModalProps> = ({
  selectedIndicatorList,
  onClose,
}) => {
  if (!selectedIndicatorList) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto flex flex-col shadow-2xl relative" id="indicator-list-modal">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm uppercase font-mono tracking-wider">
              {selectedIndicatorList.label}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Se listan <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedIndicatorList.list.length} contratos</span> vinculados a esta métrica.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 flex items-start gap-2 shadow-2xs">
            <Info className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block font-sans">Verificación de expediente público</span>
              <p className="leading-relaxed font-sans">
                Este listado es puramente informativo. Puede utilizar el enlace "Ver Expediente SECOP" para acceder de forma directa y transparente a la fuente oficial en SECOP II.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {selectedIndicatorList.list.map((c, index) => {
              const secopUrl = getSafeSecopUrl(c.urlproceso);
              return (
                <div key={c.id_contrato} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 bg-slate-50/20 dark:bg-slate-950/20">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      {renderContratoBadge(index)}
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">ID: {c.id_contrato}</span>
                    </div>
                    {renderEstadoSemaforo(c.estado_contrato)}
                  </div>

                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Objeto:</span>
                      <p className="italic bg-white dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-200 leading-normal font-sans">
                        &ldquo;{c.objeto_del_contrato}&rdquo;
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono uppercase block">Contratista</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{normalizeName(c.proveedor_adjudicado)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono uppercase block">Valor Contrato</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-sans">{formatCOP(c.valor_del_contrato)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono uppercase block">Fecha Firma</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(c.fecha_de_firma)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 font-mono uppercase block">Supervisor</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{normalizeName(c.nombre_supervisor || 'No registrado')}</span>
                      </div>
                    </div>
                  </div>

                  {secopUrl && (
                    <div className="flex justify-end pt-1">
                      <a
                        href={secopUrl}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-0.5 cursor-pointer hover:underline font-sans"
                      >
                        Ver Expediente SECOP <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900 font-sans"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
