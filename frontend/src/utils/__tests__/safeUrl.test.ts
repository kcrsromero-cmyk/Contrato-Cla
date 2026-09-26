import { describe, it, expect } from 'vitest';
import { getSafeSecopUrl, toSafeExternalUrl } from '../safeUrl';

describe('toSafeExternalUrl', () => {
  it('acepta URLs http(s) de SECOP', () => {
    const url = 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.123';
    expect(toSafeExternalUrl(url)).toBe(url);
  });

  it.each([
    'javascript:alert(1)',
    ' JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '/ruta/relativa',
    '',
    'no es una url',
  ])('rechaza %s', (value) => {
    expect(toSafeExternalUrl(value)).toBeNull();
  });

  it('rechaza valores que no son string', () => {
    expect(toSafeExternalUrl(undefined)).toBeNull();
    expect(toSafeExternalUrl(123)).toBeNull();
  });
});

describe('getSafeSecopUrl', () => {
  it('soporta urlproceso como objeto { url }', () => {
    expect(getSafeSecopUrl({ url: 'https://community.secop.gov.co/x' })).toBe('https://community.secop.gov.co/x');
  });

  it('bloquea javascript: dentro del objeto', () => {
    expect(getSafeSecopUrl({ url: 'javascript:alert(1)' })).toBeNull();
  });

  it('devuelve null si no hay urlproceso', () => {
    expect(getSafeSecopUrl(null)).toBeNull();
    expect(getSafeSecopUrl({})).toBeNull();
  });
});
