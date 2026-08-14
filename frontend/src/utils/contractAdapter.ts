import { Contrato } from '../types';

export function mapContractToViewModel(c: any): Contrato {
  return {
    nombre_entidad: c.entityName,
    nit_entidad: c.entityNit,
    codigo_entidad: c.entityCode,
    departamento: c.department,
    ciudad: c.city,
    localizaci_n: c.location,
    orden: c.order,
    sector: c.sector,
    rama: c.branch,
    entidad_centralizada: c.centralizedEntity,

    id_contrato: c.contractId,
    referencia_del_contrato: c.reference,
    proceso_de_compra: c.procurementProcessId,

    estado_contrato: c.status,
    tipo_de_contrato: c.contractType,
    modalidad_de_contratacion: c.modality,
    justificacion_modalidad_de: c.justification,

    objeto_del_contrato: c.object,
    condiciones_de_entrega: c.deliveryConditions,

    fecha_de_firma: c.signatureDate,
    fecha_de_inicio_del_contrato: c.startDate,
    fecha_de_fin_del_contrato: c.endDate,
    ultima_actualizacion: c.lastUpdate,

    proveedor_adjudicado: c.supplierId,

    valor_del_contrato: c.contractValue,
    valor_de_pago_adelantado: c.advancePaymentValue,
    valor_facturado: c.invoicedValue,
    valor_pagado: c.paidValue,
    valor_pendiente_de_pago: c.pendingPaymentValue,
    valor_pendiente_de_ejecucion: c.pendingExecutionValue,
    saldo_cdp: c.cdpBalance,

    nombre_supervisor: c.supervisorName,
    nombre_ordenador_del_gasto: c.spenderName,

    duraci_n_del_contrato: c.duration,
    dias_adicionados: c.addedDays,
    el_contrato_puede_ser_prorrogado: c.isExtendable,
    direcci_n_de_ejecuci_n_del_contrato: c.location,
  } as Contrato;
}
