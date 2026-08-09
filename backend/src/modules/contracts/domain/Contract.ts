/**
 * Canonical Contract Entity
 * Represents the normalized contract definition decoupled from external providers (e.g., Socrata, SECOP).
 */
export interface Contract {
  id_contrato: string;
  nombre_entidad: string;
  nit_entidad?: string;
  codigo_entidad: string;
  departamento: string;
  ciudad: string;

  referencia_del_contrato?: string;
  proceso_de_compra?: string;
  urlproceso?: { url: string } | string;

  estado_contrato: string;
  tipo_de_contrato: string;
  modalidad_de_contratacion: string;
  justificacion_modalidad_de?: string;

  objeto_del_contrato: string;
  descripcion_del_proceso?: string;
  condiciones_de_entrega?: string;

  fecha_de_firma?: string;
  fecha_de_inicio_del_contrato?: string;
  fecha_de_fin_del_contrato?: string;
  ultima_actualizacion?: string;

  tipodocproveedor?: string;
  documento_proveedor?: string;
  proveedor_adjudicado?: string;
  codigo_proveedor?: string;

  valor_del_contrato: number;
  valor_de_pago_adelantado: number;
  valor_facturado: number;
  valor_pagado: number;
  valor_pendiente_de_pago: number;
  valor_pendiente_de_ejecucion: number;
  saldo_cdp: number;

  nombre_supervisor?: string;
  tipo_de_documento_supervisor?: string;
  nombre_ordenador_del_gasto?: string;

  duraci_n_del_contrato: number;
  dias_adicionados: number;
  el_contrato_puede_ser_prorrogado?: string;
  direcci_n_de_ejecuci_n_del_contrato?: string;
  localizaci_n?: string;
  entidad_centralizada?: string;
  orden?: string;
  sector?: string;
  rama?: string;
}
