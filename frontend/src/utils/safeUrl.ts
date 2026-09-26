/**
 * Devuelve una URL externa segura para usar en href, o null.
 * Solo acepta http(s): bloquea esquemas como javascript:, data: o vbscript:
 * que podrían venir en datos externos (p. ej. urlproceso de SECOP).
 */
export function toSafeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** urlproceso llega como string o como objeto { url }. */
export function getSafeSecopUrl(urlproceso: unknown): string | null {
  if (urlproceso && typeof urlproceso === 'object' && 'url' in urlproceso) {
    return toSafeExternalUrl((urlproceso as { url?: unknown }).url);
  }
  return toSafeExternalUrl(urlproceso);
}
