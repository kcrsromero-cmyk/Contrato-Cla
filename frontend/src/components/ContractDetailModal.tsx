import React from 'react';
import { Contrato } from '../types';
import { formatCOP, formatDate, normalizeName } from '../utils/helpers';
import { X, ExternalLink, Calendar, Building, DollarSign, FileText, Scale, User } from 'lucide-react';

interface ContractDetailModalProps {
  contract: Contrato | null;
  onClose: () => void;
}

const getSecopUrl = (contrato: Contrato) => {
  if (!contrato.urlproceso) return null;
  if (typeof contrato.urlproceso === 'object' && contrato.urlproceso.url) {
    return contrato.urlproceso.url;
  }
  if (typeof contrato.urlproceso === 'string') {
    return contrato.urlproceso;
  }
  return null;
};

// Helpers from ContratosView
function maskDocument(document: string, tipoDoc?: string): string {
  if (!document || document === 'No registrado') return 'No registrado';
  const clean = document.trim();

  const tipo = (tipoDoc || '').trim().toLowerCase();

  const isNaturalPerson =
    tipo.includes('cédula') ||
    tipo.includes('ciudadanía') ||
    tipo.includes('ciudadania') ||
    tipo.includes('extranjería') ||
    tipo.includes('extranjeria') ||
    tipo.includes('tarjeta') ||
    tipo.includes('pasaporte') ||
    tipo === 'cc' ||
    tipo === 'ce' ||
    tipo === 'ti' ||
    tipo === 'pa';

  if (!isNaturalPerson) {
    return clean;
  }

  if (clean.length < 5) return '***';

  const firstTwo = clean.substring(0, 2);
  const lastTwo = clean.substring(clean.length - 2);
  const maskedLength = clean.length - 4;
  const maskedSection = '*'.repeat(maskedLength);

  return `${firstTwo}${maskedSection}${lastTwo}`;
}

const getEstadoSemaforoConfig = (estado: string) => {
  const norm = estado.toLowerCase().trim();

  if (norm.includes('terminado') || norm.includes('liquidado') || norm.includes('cerrado')) {
    return {
      label: 'Cerrado/Liquidado',
      colorClass: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
      dotClass: 'bg-emerald-500'
    };
  }
  if (norm.includes('ejecución') || norm.includes('celebrado') || norm.includes('activo') || norm.includes('aprobado')) {
    return {
      label: 'Activo/Ejecución',
      colorClass: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50',
      dotClass: 'bg-indigo-500 animate-pulse'
    };
  }
  if (norm.includes('suspendido') || norm.includes('prorrogado') || norm.includes('modificado')) {
    return {
      label: 'Suspendido/Modificado',
      colorClass: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
      dotClass: 'bg-amber-500'
    };
  }
  if (norm.includes('borrador') || norm.includes('convocatoria') || norm.includes('evaluación') || norm.includes('adjudicado')) {
    return {
      label: 'En Proceso/Adjudicado',
      colorClass: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
      dotClass: 'bg-blue-500'
    };
  }
  if (norm.includes('cancelado') || norm.includes('descartado') || norm.includes('anulado') || norm.includes('revocado')) {
    return {
      label: 'Cancelado/Anulado',
      colorClass: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50',
      dotClass: 'bg-red-500'
    };
  }
  return {
    label: estado || 'Desconocido',
    colorClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-400'
  };
};

function renderEstadoSemaforo(estado: string) {
  const config = getEstadoSemaforoConfig(estado);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono tracking-wide ${config.colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
      {config.label}
    </span>
  );
}

export default function ContractDetailModal({ contract: selectedContract, onClose }: ContractDetailModalProps) {
  if (!selectedContract) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative" id="contrato-detail-modal">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
          <div className="min-w-0 pr-6">
            <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Detalle Integral de Contrato</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate font-sans" title={selectedContract.proveedor_adjudicado}>
              {normalizeName(selectedContract.proveedor_adjudicado)}
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-455 mt-0.5">
              ID: {selectedContract.id_contrato} | {selectedContract.tipodocproveedor || 'CC/NIT'}: {maskDocument(selectedContract.documento_proveedor || '', selectedContract.tipodocproveedor)} | Referencia: {selectedContract.referencia_del_contrato || 'No reportada'}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado:</span>
              {renderEstadoSemaforo(selectedContract.estado_contrato || '')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-550 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">

          {/* Grid 1: Datos principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Columna Izquierda */}
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-white dark:bg-slate-900 shadow-2xs">
                <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Información General
                </h5>
                <div className="space-y-2">
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 mb-0.5">Referencia de Contrato:</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono break-all">
                      {selectedContract.referencia_del_contrato || 'No reportada'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 mb-0.5">ID Proceso SECOP II:</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono break-all">
                      {selectedContract.id_contrato}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 mb-0.5">Proceso de Compra:</span>
                    <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 text-xs select-all truncate" title={selectedContract.proceso_de_compra || 'No especificado'}>
                      {selectedContract.proceso_de_compra || 'No especificado'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Objeto */}
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50 shadow-2xs">
              <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
                Objeto del Contrato
              </h5>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-justify">
                {selectedContract.objeto_del_contrato}
              </p>
            </div>
          </div>

          {/* Grid 2: Fechas y Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fechas */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
              <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Cronograma
              </h5>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Firma</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedContract.fecha_de_firma)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Inicio</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedContract.fecha_de_inicio_del_contrato)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Fin Previsto</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedContract.fecha_de_fin_del_contrato)}</div>
                </div>
              </div>
            </div>

            {/* Valores */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
              <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" /> Resumen Financiero
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-indigo-100 dark:border-indigo-900/50 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Valor Total</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {formatCOP(selectedContract.valor_del_contrato)}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Monto Pagado</div>
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-450 mt-1">
                    {formatCOP(selectedContract.valor_pagado)}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Pendiente de Pago</div>
                  <div className="text-sm font-bold text-amber-700 dark:text-amber-450 mt-1">
                    {formatCOP(selectedContract.valor_pendiente_de_pago)}
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Pendiente de Ejecución</div>
                  <div className="text-sm font-bold text-slate-600 dark:text-slate-405 mt-1">
                    {formatCOP(selectedContract.valor_pendiente_de_ejecucion)}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 3: Detalles legales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-white dark:bg-slate-900 shadow-2xs">
                <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Régimen y Justificación
                </h5>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Modalidad de Contratación:</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{selectedContract.modalidad_de_contratacion}</div>
                </div>
                {selectedContract.justificacion_modalidad_de && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Justificación de Modalidad:</div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-snug">{selectedContract.justificacion_modalidad_de}</div>
                  </div>
                )}
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-white dark:bg-slate-900 shadow-2xs">
                <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Supervisión y Control
                </h5>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Supervisor Designado:</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{normalizeName(selectedContract.nombre_supervisor)}</div>
                </div>
                {selectedContract.nombre_ordenador_del_gasto && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Ordenador del Gasto:</div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{normalizeName(selectedContract.nombre_ordenador_del_gasto)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Clasificación y Estructura de la Entidad (Nuevos campos SECOP II) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs md:col-span-2">
              <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Clasificación y Estructura de la Entidad
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Orden Administrativo</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.orden || 'No especificado'}</div>
                </div>
                <div>
                  <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Régimen Centralización</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.entidad_centralizada || 'No especificado'}</div>
                </div>
                <div>
                  <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Sector de Actividad</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.sector || 'No especificado'}</div>
                </div>
                <div>
                  <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Rama del Poder</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.rama || 'No especificado'}</div>
                </div>
              </div>
              {selectedContract.localizaci_n && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span className="font-bold font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Ubicación del Registro de la Entidad:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{selectedContract.localizaci_n}</span>
                </div>
              )}
            </div>

            {/* Datos Técnicos y Plazos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs shadow-2xs md:col-span-2">
              <div>
                <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[10px] uppercase tracking-widest">Duración Original</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.duraci_n_del_contrato} días</div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[10px] uppercase tracking-widest">Días Adicionados</div>
                <div className={`font-bold mt-0.5 ${(Number(selectedContract.dias_adicionados) || 0) > 0 ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                  {selectedContract.dias_adicionados} días
                </div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[10px] uppercase tracking-widest">Prorrogable</div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.el_contrato_puede_ser_prorrogado || 'No especificado'}</div>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3 sticky bottom-0 z-10">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900"
            >
              Cerrar Ventana
            </button>
            {getSecopUrl(selectedContract) && (
              <a
                href={getSecopUrl(selectedContract)!}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                Ir al Expediente SECOP II <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
