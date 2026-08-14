import { Contrato } from '../types';

export function mapContractToViewModel(contract: any): Contrato {
  return {
    nombre_entidad: contract.entityName,
    nit_entidad: contract.entityNit,
    codigo_entidad: contract.entityCode,
    departamento: contract.department,
    ciudad: contract.city,

    id_contrato: contract.contractId,
    referencia_del_contrato: contract.reference,
    proceso_de_compra: contract.procurementProcessId,

    estado_contrato: contract.status,
    tipo_de_contrato: contract.contractType,
    modalidad_de_contratacion: contract.modality,
    justificacion_modalidad_de: contract.justification,

    objeto_del_contrato: contract.object,
    condiciones_de_entrega: contract.deliveryConditions,

    fecha_de_firma: contract.signatureDate,
    fecha_de_inicio_del_contrato: contract.startDate,
    fecha_de_fin_del_contrato: contract.endDate,
    ultima_actualizacion: contract.lastUpdate,

    proveedor_adjudicado: contract.supplierId,

    valor_del_contrato: contract.contractValue,
    valor_de_pago_adelantado: contract.advancePaymentValue,
    valor_facturado: contract.invoicedValue,
    valor_pagado: contract.paidValue,
    valor_pendiente_de_pago: contract.pendingPaymentValue,
    valor_pendiente_de_ejecucion: contract.pendingExecutionValue,
    saldo_cdp: contract.cdpBalance,

    nombre_supervisor: contract.supervisorName,
    nombre_ordenador_del_gasto: contract.spenderName,

    duraci_n_del_contrato: contract.duration,
    dias_adicionados: contract.addedDays,
    el_contrato_puede_ser_prorrogado: contract.isExtendable,
    direcci_n_de_ejecuci_n_del_contrato: contract.location,
    localizaci_n: contract.location,
    entidad_centralizada: contract.centralizedEntity,
    orden: contract.order,
    sector: contract.sector,
    rama: contract.branch
  };
}
