export type DocumentType =
  'CC' | 'NIT' | 'CE' | 'PA' | 'PEP' | 'PPT' | 'TI' | 'RC' | 'OTRO' | 'UNKNOWN';

export function normalizeDocumentType(raw: string | null | undefined): DocumentType {
  if (!raw) return 'UNKNOWN';
  const v = raw.trim().toLowerCase();
  if (v === 'cédula de ciudadanía' || v === 'cedula de ciudadania' || v === 'citizenship identification') return 'CC';
  if (v === 'cédula de extranjería' || v === 'cedula de extranjeria' || v === 'foreigner identification') return 'CE';
  if (v === 'nit' || v === 'vat') return 'NIT';
  if (v === 'pasaporte') return 'PA';
  if (v === 'permiso especial de permanencia') return 'PEP';
  if (v === 'permiso por protección temporal' || v === 'permiso por proteccion temporal') return 'PPT';
  if (v === 'tarjeta de identidad' || v === 'identity card') return 'TI';
  if (v === 'registro civil') return 'RC';
  if (v === 'otro' || v === 'other' || v === 'sin descripcion') return 'OTRO';
  return 'UNKNOWN';
}

export function isNaturalPerson(documentType: DocumentType): boolean {
  return documentType !== 'NIT';
}

export function maskDocument(documentNumber: string, documentType: DocumentType): string {
  if (!isNaturalPerson(documentType)) return documentNumber;
  const clean = documentNumber.replace(/\D/g, '');
  if (clean.length <= 5) return '*'.repeat(clean.length);
  return clean.slice(0, 5) + '*'.repeat(clean.length - 5);
}
