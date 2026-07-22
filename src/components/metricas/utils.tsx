import React from 'react';
import { Contrato } from '../../types';
import { LexicalInsight } from './types';
import { normalizeName, formatCOP } from '../../utils/helpers';

export { formatCOP };

// Overlap detection logic for contractor's contracts
export function checkOverlaps(contracts: Contrato[]) {
  const overlaps: { [id: string]: string[] } = {};
  
  const parsed = contracts.map(c => {
    const startStr = c.fecha_de_inicio_del_contrato?.split('T')[0];
    const finStr = c.fecha_de_fin_del_contrato?.split('T')[0];
    return {
      id: c.id_contrato,
      start: startStr ? new Date(startStr) : null,
      end: finStr ? new Date(finStr) : null,
      startStr,
      finStr,
    };
  });

  for (let i = 0; i < parsed.length; i++) {
    const a = parsed[i];
    if (!a.start || !a.end || isNaN(a.start.getTime()) || isNaN(a.end.getTime())) continue;

    for (let j = i + 1; j < parsed.length; j++) {
      const b = parsed[j];
      if (!b.start || !b.end || isNaN(b.start.getTime()) || isNaN(b.end.getTime())) continue;

      // Check overlap
      if (a.start <= b.end && b.start <= a.end) {
        if (!overlaps[a.id]) overlaps[a.id] = [];
        if (!overlaps[b.id]) overlaps[b.id] = [];
        
        overlaps[a.id].push(b.id);
        overlaps[b.id].push(a.id);
      }
    }
  }

  return overlaps;
}

export function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

export function maskDocument(document: string, tipoDoc?: string): string {
  if (!document || document === 'No registrado') return 'No registrado';
  const clean = document.trim();
  
  const tipo = (tipoDoc || '').trim().toLowerCase();
  
  // Conditionally mask only if it corresponds to a natural person.
  // Standard natural person types in Colombia contain cédula, extranjería, tarjeta, pasaporte, etc.
  // We keep NIT complete.
  const isNaturalPerson = 
    tipo.includes('cédula') || 
    tipo.includes('cedula') || 
    tipo.includes('extranjería') || 
    tipo.includes('extranjeria') || 
    tipo.includes('pasaporte') || 
    tipo.includes('tarjeta') || 
    tipo.includes('identidad') || 
    tipo.includes('persona natural') || 
    tipo.includes('registro civil') ||
    (tipo !== 'nit' && tipo !== 'nit de extranjería' && tipo !== 'nit persona jurídica');

  if (isNaturalPerson) {
    if (clean.length <= 4) return '***';
    // Keep first 3 characters and last 2, replace middle with '*'
    const first = clean.slice(0, 3);
    const last = clean.slice(-2);
    const maskLength = Math.max(3, clean.length - 5);
    const masked = '*'.repeat(maskLength);
    return `${first}${masked}${last}`;
  }
  
  return clean; // NIT is shown completely
}

export function getEstadoSemaforoConfig(estado: string) {
  const clean = (estado || '').trim().toLowerCase();
  
  // Green: Activo, Saludable, En curso normal
  if (clean === 'en ejecución' || clean === 'en ejecucion' || clean === 'aprobado') {
    return {
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
      label: estado || 'En ejecución'
    };
  }
  
  // Finalizado correctamente
  if (clean === 'cerrado' || clean === 'terminado') {
    return {
      colorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      dotClass: 'bg-indigo-500',
      label: estado || 'Terminado'
    };
  }

  // Amber: En proceso / Trámite / Modificación / Prórroga
  if (
    clean === 'prorrogado' || 
    clean === 'modificado' || 
    clean === 'enviado proveedor' || 
    clean === 'en aprobación' || 
    clean === 'en aprobacion'
  ) {
    return {
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      label: estado || 'En trámite/Prorrogado'
    };
  }

  // Red: Crítico / Interrumpido / Suspendido / Cancelado / Cedido
  if (
    clean === 'cancelado' || 
    clean === 'cedido' || 
    clean === 'suspendido'
  ) {
    return {
      colorClass: 'bg-rose-50 text-rose-800 border-rose-200',
      dotClass: 'bg-rose-500 animate-pulse',
      label: estado || 'Interrumpido/Cancelado'
    };
  }

  // Gray: Borrador o preparación preliminar
  return {
    colorClass: 'bg-slate-50 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
    label: estado || 'Borrador'
  };
}

export function renderEstadoSemaforo(estado: string) {
  const config = getEstadoSemaforoConfig(estado);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono tracking-wide ${config.colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
      {config.label}
    </span>
  );
}

export const contractCounterColors = [
  'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100/50',
  'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/50',
  'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/50',
  'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100/50',
  'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100/50',
  'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100/50',
  'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100/50'
];

export function renderContratoBadge(index: number) {
  const colorClass = contractCounterColors[index % contractCounterColors.length];
  return (
    <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border transition-colors ${colorClass}`}>
      Contrato #{index + 1}
    </span>
  );
}

export function analyzeLexicalVariations(objects: string[]): LexicalInsight[] {
  const insights: LexicalInsight[] = [];
  if (objects.length < 2) return insights;

  // Helper to normalize accents
  const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();

  // 1. Check final punctuation differences
  const withPeriod = objects.filter(obj => obj.endsWith('.'));
  const withoutPeriod = objects.filter(obj => !obj.endsWith('.'));
  if (withPeriod.length > 0 && withoutPeriod.length > 0) {
    insights.push({
      type: 'puntuacion',
      title: 'Uso de puntuación final',
      description: 'Algunos registros finalizan con punto final (.) mientras que otros omiten este carácter de cierre.',
      examples: [
        { original: `Con punto final (.): ${withPeriod.length} registros (ej. "...${withPeriod[0].slice(-25)}")` },
        { original: `Sin punto final: ${withoutPeriod.length} registros (ej. "...${withoutPeriod[0].slice(-25)}")` }
      ]
    });
  }

  // 2. Suffix omissions / differences (e.g. Ending with "MUNICIPIO DE FLORENCIA" vs "MUNICIPIO" vs "MUNICIPO")
  const endings = objects.map(obj => {
    const clean = obj.replace(/\.+$/, '').trim().toUpperCase();
    if (clean.endsWith('MUNICIPIO DE FLORENCIA')) return 'MUNICIPIO DE FLORENCIA';
    if (clean.endsWith('MUNICIPIO')) return 'MUNICIPIO';
    if (clean.endsWith('MUNICIPO')) return 'MUNICIPO';
    const words = clean.split(/\s+/);
    return words.slice(-2).join(' ');
  });
  const uniqueEndings = Array.from(new Set(endings));
  if (uniqueEndings.length > 1) {
    insights.push({
      type: 'cierre_estructura',
      title: 'Variaciones en la estructura de cierre',
      description: 'El texto final de las oraciones difiere entre registros (por ejemplo, omitiendo la ubicación geográfica "DE FLORENCIA" u otros complementos al final).',
      examples: uniqueEndings.map(end => ({ original: `Finaliza en: "${end}"` }))
    });
  }

  // 3. Extract all unique words and group them by normalized form (without accents) to find accent differences
  const wordOccurrence: { [word: string]: Set<string> } = {};
  const allCleanWords = new Set<string>();

  objects.forEach(obj => {
    const tokens = obj.split(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]+/).map(w => w.trim()).filter(w => w.length > 2);
    tokens.forEach(tok => {
      const clean = removeAccents(tok);
      allCleanWords.add(clean);
      if (!wordOccurrence[clean]) {
        wordOccurrence[clean] = new Set();
      }
      wordOccurrence[clean].add(tok);
    });
  });

  const accentVariations: { clean: string; forms: string[] }[] = [];
  for (const [clean, forms] of Object.entries(wordOccurrence)) {
    if (forms.size > 1) {
      accentVariations.push({ clean, forms: Array.from(forms) });
    }
  }

  // Specific common accent corrections for public procurement
  const commonCorrections = [
    { regex: /\bTECNICOS\b/gi, correct: 'TÉCNICOS', original: 'TECNICOS' },
    { regex: /\bADMINISTRACION\b/gi, correct: 'ADMINISTRACIÓN', original: 'ADMINISTRACION' },
    { regex: /\bPUBLICA\b/gi, correct: 'PÚBLICA', original: 'PUBLICA' },
    { regex: /\bCONTADURIA\b/gi, correct: 'CONTADURÍA', original: 'CONTADURIA' },
    { regex: /\bSECRETARIA\b/gi, correct: 'SECRETARÍA', original: 'SECRETARIA' },
  ];

  const spellingDetections: { original: string; correct: string }[] = [];
  commonCorrections.forEach(cor => {
    const hasUnaccented = objects.some(obj => cor.regex.test(obj));
    if (hasUnaccented) {
      spellingDetections.push({ original: cor.original, correct: cor.correct });
    }
  });

  if (accentVariations.length > 0 || spellingDetections.length > 0) {
    const listExamples: { original: string; details?: string }[] = [];
    
    accentVariations.forEach(av => {
      listExamples.push({
        original: av.forms.join(' ↔ '),
        details: `Variación de acentuación gráfica (forma normalizada: ${av.clean})`
      });
    });

    spellingDetections.forEach(sd => {
      listExamples.push({
        original: `Palabra sin tilde detectada: "${sd.original}"`,
        details: `Forma ortográficamente correcta recomendada (RAE): "${sd.correct}"`
      });
    });

    insights.push({
      type: 'ortografia',
      title: 'Diferencias de tildes y sugerencias ortográficas',
      description: 'Se identificaron palabras idénticas que alternan el uso de acentuación gráfica o tildes faltantes según las reglas ortográficas oficiales.',
      examples: listExamples
    });
  }

  // 4. Typos / Levenshtein Distance between words in the dictionary
  const wordsList = Array.from(allCleanWords);
  const typoPairs: { wordA: string; wordB: string; distance: number }[] = [];

  for (let i = 0; i < wordsList.length; i++) {
    for (let j = i + 1; j < wordsList.length; j++) {
      const wA = wordsList[i];
      const wB = wordsList[j];
      if (wA.length < 5 || wB.length < 5) continue;
      
      const dist = getLevenshteinDistance(wA, wB);
      // Catch simple edits (MUNICIPO ↔ MUNICIPIO)
      if (dist > 0 && dist <= 2) {
        // Exclude plural differences if they are just ending in S
        if (Math.abs(wA.length - wB.length) === 1 && (wA.endsWith('S') || wB.endsWith('S'))) {
          continue;
        }
        typoPairs.push({ wordA: wA, wordB: wB, distance: dist });
      }
    }
  }

  if (typoPairs.length > 0) {
    insights.push({
      type: 'error_tipografico',
      title: 'Posibles errores tipográficos o discrepancias de digitación',
      description: 'Se detectaron palabras con alta similitud fonética y visual pero leves variaciones de deletreo, lo cual sugiere probables erratas en el reporte oficial del SECOP II.',
      examples: typoPairs.map(tp => {
        const origA = Array.from(wordOccurrence[tp.wordA] || [tp.wordA])[0];
        const origB = Array.from(wordOccurrence[tp.wordB] || [tp.wordB])[0];
        return {
          original: `"${origA}" ↔ "${origB}"`,
          details: `Diferencia de ${tp.distance} letra(s) (ej. MUNICIPO ↔ MUNICIPIO, TECNICO ↔ TÉCNICO)`
        };
      })
    });
  }

  // 5. Connectors or phrasing differences (like "EN LA ESCUELA" vs "PARA LA ESCUELA", "- PDET" vs "PDET")
  const hasEnLa = objects.some(obj => obj.toUpperCase().includes('EN LA ESCUELA'));
  const hasParaLa = objects.some(obj => obj.toUpperCase().includes('PARA LA ESCUELA'));
  const connectorExamples: { original: string }[] = [];
  if (hasEnLa && hasParaLa) {
    connectorExamples.push({ original: 'Alternancia de "EN LA" ↔ "PARA LA" (ej. "COMO INSTRUCTOR EN LA ESCUELA..." vs "COMO INSTRUCTOR PARA LA ESCUELA...")' });
  }

  const hasGuionPDET = objects.some(obj => obj.toUpperCase().includes('- PDET'));
  const hasNoGuionPDET = objects.some(obj => {
    const text = obj.toUpperCase();
    return text.includes('PDET') && !text.includes('- PDET');
  });
  if (hasGuionPDET && hasNoGuionPDET) {
    connectorExamples.push({ original: 'Uso o ausencia de guion de separación: "- PDET" ↔ "PDET" (sin guion)' });
  }

  if (connectorExamples.length > 0) {
    insights.push({
      type: 'conector',
      title: 'Cambios gramaticales o de conectores',
      description: 'Se detectaron alternancias en el uso de preposiciones, nexos o guiones de separación que modifican la redacción sintáctica sin cambiar el fondo del objeto.',
      examples: connectorExamples
    });
  }

  // 6. Substituted Terms: terms that are present in at least one object but absent in others
  const stopwords = new Set([
    'DE', 'EL', 'LA', 'Y', 'EN', 'CON', 'A', 'POR', 'PARA', 'DEL', 'LOS', 'LAS', 'AL', 'E', 'O', 'U', 
    'SU', 'SUS', 'CONTRATO', 'PRESTACION', 'SERVICIOS', 'MUNICIPIO', 'APOYO', 'GESTION', 'ACTIVIDADES',
    'OBJETO', 'SOBRE', 'ESTE', 'ESTO', 'ESTA', 'FLORENCIA', 'CAQUETA', 'COMO', 'QUE',
    'MUNICIPAL', 'DESPACHO', 'DISTRITO', 'DEPARTAMENTO', 'ALCALDIA', 'GOBERNACION', 'TERMINOS'
  ]);

  const wordsPresenceCount: { [word: string]: number } = {};
  objects.forEach(obj => {
    const words = Array.from(new Set(obj.toUpperCase().split(/[^A-ZÁÉÍÓÚÑÜ]+/)));
    words.forEach(w => {
      const cleanW = removeAccents(w);
      if (cleanW.length <= 3 || stopwords.has(cleanW)) return;
      wordsPresenceCount[w] = (wordsPresenceCount[w] || 0) + 1;
    });
  });

  const totalCount = objects.length;
  const substitutedTerms = Object.entries(wordsPresenceCount)
    .filter(([word, count]) => count < totalCount && count >= 1)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  if (substitutedTerms.length > 0) {
    insights.push({
      type: 'termino_variable',
      title: 'Términos variables o especialidades identificadas',
      description: 'Se identificaron términos clave específicos que alternan de un registro a otro, sugiriendo una plantilla estandarizada donde solo varía la especialidad, disciplina u objetivo operativo.',
      examples: substitutedTerms.slice(0, 10).map(st => ({
        original: `"${st.word}"`,
        details: `Presente en ${st.count} de ${totalCount} contratos del grupo (determina el perfil específico, área disciplinar o rol técnico requerido)`
      }))
    });
  }

  return insights;
}
