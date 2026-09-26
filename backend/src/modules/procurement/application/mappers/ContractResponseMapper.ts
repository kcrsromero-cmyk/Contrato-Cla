import { Contract } from '../../domain/types';
import { maskDocument, normalizeDocumentType } from '../../../../utils/documentNormalizer';

export function toContractResponseDto(raw: Contract): Contract {
  return {
    ...raw,
    supplierDocument: raw.supplierDocument
      ? maskDocument(raw.supplierDocument, normalizeDocumentType(raw.supplierDocumentType))
      : raw.supplierDocument,
    supervisorDocument: raw.supervisorDocument
      ? maskDocument(raw.supervisorDocument, normalizeDocumentType(raw.supervisorDocumentType))
      : raw.supervisorDocument,
    legalRepDocument: raw.legalRepDocument
      ? maskDocument(raw.legalRepDocument, normalizeDocumentType(raw.legalRepDocumentType))
      : raw.legalRepDocument,
  };
}
