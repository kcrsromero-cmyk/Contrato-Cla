export interface Contrato {
  nombre_entidad: string;
  nit_entidad?: string;
  codigo_entidad: string;
  departamento: string;
  ciudad: string;
  
  id_contrato: string;
  referencia_del_contrato?: string;
  proceso_de_compra?: string;
  urlproceso?: { url: string } | string; // Socrata can return URLs as objects or strings

  estado_contrato: string;
  tipo_de_contrato: string;
  modalidad_de_contratacion: string;
  justificacion_modalidad_de?: string;

  objeto_del_contrato?: string;
  descripcion_del_proceso?: string;
  condiciones_de_entrega?: string;

  fecha_de_firma?: string;
  fecha_de_inicio_del_contrato?: string;
  fecha_de_fin_del_contrato?: string;
  ultima_actualizacion?: string;

  tipodocproveedor?: string;
  documento_proveedor?: string;
  proveedor_adjudicado?: string;
  supplierDocumentDisplay?: string;
  supplierDocumentType?: string;
  codigo_proveedor?: string;

  valor_del_contrato?: string | number;
  valor_de_pago_adelantado?: string | number;
  valor_facturado?: string | number;
  valor_pagado?: string | number;
  valor_pendiente_de_pago?: string | number;
  valor_pendiente_de_ejecucion?: string | number;
  saldo_cdp?: string | number;

  nombre_supervisor?: string;
  tipo_de_documento_supervisor?: string;
  nombre_ordenador_del_gasto?: string;
  
  duraci_n_del_contrato?: string | number;
  dias_adicionados?: string | number;
  el_contrato_puede_ser_prorrogado?: string;
  direcci_n_de_ejecuci_n_del_contrato?: string;
  localizaci_n?: string;
  entidad_centralizada?: string;
  orden?: string;
  sector?: string;
  rama?: string;
}

export interface QueryContext {
  departamento: string;
  ciudad: string;
  codigoEntidad: string;
  nombreEntidad: string;
  tipoPeriodo: 'anio' | 'atajo' | 'rango';
  anio: string;
  atajo: string; // '30' | '90' | '180' | 'este-anio' | 'anterior'
  fechaDesde: string;
  fechaHasta: string;
}

export interface GlobalFilters {
  estado: string;
  tipoContrato: string;
  modalidad: string;
  supervisor: string;
  contratista: string;
  texto: string;
  valorMin: string;
  valorMax: string;
}

export interface EntidadResumen {
  departamento: string;
  ciudad: string;
  codigo_entidad: string;
  nombre_entidad: string;
  nit_entidad?: string;
  localizaci_n?: string;
  entidad_centralizada?: string;
  orden?: string;
  sector?: string;
  rama?: string;
}
