export interface Supplier {
  id: string;
  documentType?: string;
  documentNumber?: string;
  name: string;
  code?: string;
}

export interface ProcurementProcess {
  id: string;
  processId: string;
  description?: string;
  url?: string;
}

export interface Contract {
  id: string;
  contractId: string;
  reference?: string;
  status?: string;
  contractType?: string;
  modality?: string;
  justification?: string;
  object: string;
  deliveryConditions?: string;

  signatureDate?: Date;
  startDate?: Date;
  endDate?: Date;
  lastUpdate?: Date;

  contractValue?: number;
  advancePaymentValue?: number;
  invoicedValue?: number;
  paidValue?: number;
  pendingPaymentValue?: number;
  pendingExecutionValue?: number;
  cdpBalance?: number;

  duration?: number;
  addedDays?: number;
  isExtendable?: string;

  location?: string;
  centralizedEntity?: string;
  order?: string;
  sector?: string;
  branch?: string;

  supervisorName?: string;
  spenderName?: string;

  department?: string;
  city?: string;
  entityName: string;
  entityCode: string;
  entityNit?: string;

  supplierName?: string;
  procurementProcessId?: string;
  urlproceso?: string | null;
  supplierDocument?: string | null;
  supplierDocumentType?: string | null;
  supervisorDocument?: string | null;
  supervisorDocumentType?: string | null;
  legalRepDocument?: string | null;
  legalRepDocumentType?: string | null;
  legalRepName?: string | null;
  supplierDocumentDisplay?: string;
  supervisorDocumentDisplay?: string;
}

export interface FilterParams {
  codigoEntidad: string;
  fechaDesde: string;
  fechaHasta: string;
}
