/**
 * Formatting and data cleaning helper functions
 */

/**
 * Format number to Colombian Pesos (COP)
 */
export function formatCOP(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '$ 0';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '$ 0';
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format generic number with thousand separators
 */
export function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '0';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Truncate long strings elegantly
 */
export function truncateText(text: string | undefined | null, maxLength: number = 150): string {
  if (!text) return 'No especificado';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format floating_timestamp (e.g. "2025-01-15T00:00:00.000") to human-readable Colombian date
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'No registrada';
  try {
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    
    const months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    
    return `${day} ${months[monthIndex]}. ${year}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Normalize and title-case names for clean presentation
 */
export function normalizeName(name: string | undefined | null): string {
  if (!name) return 'No especificado';
  const trimmed = name.trim().replace(/[*]+/g, '').replace(/\s+/g, ' ');
  
  // Title Case logic for clean display
  return trimmed
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Exclude small prepositions from title casing if desired, but keep simple
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Format Colombian Pesos (COP) into millions representation for easier citizen reading.
 * e.g., $ 84.1 millones or $ 1.250 millones.
 * Includes a clean, safe representation and fallback for small values (< 1 million).
 */
export function formatCurrencyMillions(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '$0';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '$0';
  
  const absoluteValue = Math.abs(num);
  if (absoluteValue < 1000000) {
    return formatCOP(num);
  }
  
  const millones = num / 1000000;
  
  // Decimals: up to 1 decimal place makes it very clear and avoids 3 decimal places ambiguity
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(millones);
  
  return `$${formatted} millones`;
}

/**
 * Format bytes to a human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0 || isNaN(bytes)) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

