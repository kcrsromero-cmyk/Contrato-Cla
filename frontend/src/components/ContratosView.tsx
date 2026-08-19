import React, { useState, useMemo, useEffect } from 'react';
import { Contrato } from '../types';
import { formatCOP, formatDate, formatNumber, truncateText, normalizeName } from '../utils/helpers';
import { 
  Search, 
  SlidersHorizontal, 
  ExternalLink, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Hash,
  Eye, 
  User, 
  Calendar, 
  Building, 
  DollarSign, 
  FileText, 
  Scale,
  RefreshCw,
  Info,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clasificarContrato, obtenerResumenDeGastos } from '../utils/categorizer';
import { FavoriteButton } from './FavoriteButton';
import CategoriasGastosPanel from './CategoriasGastosPanel';
import PredictiveSearchBar from './PredictiveSearchBar';

const formatInputAmount = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseFormattedAmount = (val: string): string => {
  return val.replace(/\D/g, '');
};

const normCache = new Map<string, string>();

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  const cached = normCache.get(text);
  if (cached !== undefined) return cached;
  
  const res = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
    
  if (normCache.size > 20000) normCache.clear();
  normCache.set(text, res);
  return res;
};

function maskDocument(document: string, tipoDoc?: string): string {
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

// Custom reusable tooltip component
function InfoTooltip({ content }: { content: string }) {
  const [show, setShow] = useState(false);
  return (
    <span 
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      className="relative inline-block ml-1.5 align-middle cursor-help text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-20"
    >
      <Info className="w-3.5 h-3.5" />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2.5 bg-slate-950 dark:bg-slate-800 text-white dark:text-slate-100 text-[11px] leading-relaxed rounded-xl shadow-xl border border-slate-800 dark:border-slate-750 pointer-events-none text-left font-normal normal-case whitespace-normal z-30">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950 dark:border-t-slate-800"></span>
        </span>
      )}
    </span>
  );
}

function getEstadoSemaforoConfig(estado: string) {
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

function renderEstadoSemaforo(estado: string) {
  const config = getEstadoSemaforoConfig(estado);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono tracking-wide ${config.colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
      {config.label}
    </span>
  );
}

interface ObjetoContratoTextProps {
  objeto: string;
  maxChars?: number;
}

export function ObjetoContratoText({ objeto, maxChars = 140 }: ObjetoContratoTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHoverPopover, setShowHoverPopover] = useState(false);
  const isLong = (objeto || '').length > maxChars;

  if (!objeto) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 italic">Sin objeto registrado</p>;
  }

  return (
    <div className="relative group/objeto">
      <div 
        className="cursor-pointer"
        onMouseEnter={() => isLong && !isExpanded && setShowHoverPopover(true)}
        onMouseLeave={() => setShowHoverPopover(false)}
        onClick={(e) => {
          if (isLong) {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
            setShowHoverPopover(false);
          }
        }}
      >
        <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans transition-all ${
          !isExpanded && isLong ? 'line-clamp-2' : ''
        }`}>
          {objeto}
        </p>

        {isLong && (
          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold font-mono text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
            {isExpanded ? '▲ Ver menos' : '▼ Ver objeto completo'}
          </span>
        )}
      </div>

      {/* Popover flotante con diseño slate/oscuro en lugar del tooltip azul nativo del navegador */}
      {showHoverPopover && !isExpanded && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full sm:w-[420px] max-w-[300px] sm:max-w-[420px] p-4 bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-100 text-xs leading-relaxed rounded-2xl shadow-2xl border border-slate-700/80 dark:border-slate-750 pointer-events-none animate-fade-in font-sans break-words transition-all duration-200 ease-out">
          <div className="text-[10px] font-bold font-mono text-indigo-300 dark:text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 border-b border-slate-700/60 pb-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-300 shrink-0" /> Objeto Completo del Contrato
          </div>
          <p className="text-slate-200 dark:text-slate-200 text-xs font-normal leading-relaxed max-h-60 overflow-y-auto pr-1 break-words">
            {objeto}
          </p>
        </div>
      )}
    </div>
  );
}

interface ContratosViewProps {
  contratos: Contrato[];
  selectedModalidad?: string;
  setSelectedModalidad?: (val: string) => void;
}

export default function ContratosView({ 
  contratos,
  selectedModalidad: propSelectedModalidad,
  setSelectedModalidad: propSetSelectedModalidad
}: ContratosViewProps) {
  // Advanced filters state
  const [predictiveSearchTerm, setPredictiveSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [appliedKeywords, setAppliedKeywords] = useState<string[]>([]);
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [localModalidad, setLocalModalidad] = useState('');
  const selectedModalidad = propSelectedModalidad !== undefined ? propSelectedModalidad : localModalidad;
  const setSelectedModalidad = propSetSelectedModalidad || setLocalModalidad;

  const [minValor, setMinValor] = useState('');
  const [maxValor, setMaxValor] = useState('');
  const [tempMinValor, setTempMinValor] = useState('');
  const [tempMaxValor, setTempMaxValor] = useState('');

  // Selected contract for modal detail view
  const [selectedContract, setSelectedContract] = useState<Contrato | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Compute overall statistics for the category panel (based on full dataset passed)
  const totalGastado = useMemo(() => {
    return contratos.reduce((acc, c) => acc + (Number(c.valor_del_contrato) || 0), 0);
  }, [contratos]);

  const gastosResumen = useMemo(() => {
    return obtenerResumenDeGastos(contratos);
  }, [contratos]);

  // 1. Compute unique values of filter options dynamically based on the dataset
  const filterOptions = useMemo(() => {
    const estados = new Set<string>();
    const tipos = new Set<string>();
    const modalidades = new Set<string>();

    contratos.forEach(c => {
      if (c.estado_contrato) estados.add(c.estado_contrato);
      if (c.tipo_de_contrato) tipos.add(c.tipo_de_contrato);
      if (c.modalidad_de_contratacion) modalidades.add(c.modalidad_de_contratacion);
    });

    return {
      estados: Array.from(estados).sort(),
      tipos: Array.from(tipos).sort(),
      modalidades: Array.from(modalidades).sort()
    };
  }, [contratos]);

  // Handle applying keyword search
  const handleApplyKeywords = () => {
    if (!keywordsInput.trim()) {
      setAppliedKeywords([]);
    } else {
      const list = keywordsInput
        .split(/[\s,]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
      // Limit to a maximum of 10 words/keywords
      setAppliedKeywords(list.slice(0, 10));
    }
    setCurrentPage(1);
  };

  // 2. Apply filtering
  const filteredContratos = useMemo(() => {
    return contratos.filter(c => {
      // Predictive search filter
      if (predictiveSearchTerm.trim() !== '') {
        const predNorm = normalizeText(predictiveSearchTerm);
        const matchesObjeto = normalizeText(c.objeto_del_contrato).includes(predNorm);
        const matchesProveedor = normalizeText(c.proveedor_adjudicado).includes(predNorm);
        const matchesSupervisor = normalizeText(c.nombre_supervisor).includes(predNorm);
        const matchesReferencia = normalizeText(c.referencia_del_contrato).includes(predNorm);
        const matchesId = normalizeText(c.id_contrato).includes(predNorm);

        if (!matchesObjeto && !matchesProveedor && !matchesSupervisor && !matchesReferencia && !matchesId) {
          return false;
        }
      }

      // Free-text general search filter on key fields (accent and case insensitive)
      if (searchTerm.trim() !== '') {
        const textNorm = normalizeText(searchTerm);
        const matchesObjeto = normalizeText(c.objeto_del_contrato).includes(textNorm);
        const matchesProveedor = normalizeText(c.proveedor_adjudicado).includes(textNorm);
        const matchesSupervisor = normalizeText(c.nombre_supervisor).includes(textNorm);
        const matchesReferencia = normalizeText(c.referencia_del_contrato).includes(textNorm);
        const matchesId = normalizeText(c.id_contrato).includes(textNorm);

        if (!matchesObjeto && !matchesProveedor && !matchesSupervisor && !matchesReferencia && !matchesId) {
          return false;
        }
      }

      // Keyword comma-separated filter (accent and case insensitive, max 10)
      if (appliedKeywords.length > 0) {
        const matchFound = appliedKeywords.some(kw => {
          const kwNorm = normalizeText(kw);
          return (
            normalizeText(c.objeto_del_contrato).includes(kwNorm) ||
            normalizeText(c.proveedor_adjudicado).includes(kwNorm) ||
            normalizeText(c.nombre_supervisor).includes(kwNorm) ||
            normalizeText(c.referencia_del_contrato).includes(kwNorm) ||
            normalizeText(c.id_contrato).includes(kwNorm)
          );
        });
        if (!matchFound) return false;
      }

      // Dropdown filters
      if (selectedEstado && c.estado_contrato !== selectedEstado) return false;
      if (selectedTipo && c.tipo_de_contrato !== selectedTipo) return false;
      if (selectedModalidad && c.modalidad_de_contratacion !== selectedModalidad) return false;

      // Category spending filter
      if (selectedCategory && clasificarContrato(c) !== selectedCategory) return false;

      // Price ranges
      const val = Number(c.valor_del_contrato) || 0;
      if (minValor !== '' && val < Number(minValor)) return false;
      if (maxValor !== '' && val > Number(maxValor)) return false;

      return true;
    });
  }, [contratos, predictiveSearchTerm, searchTerm, appliedKeywords, selectedEstado, selectedTipo, selectedModalidad, selectedCategory, minValor, maxValor]);

  // 3. Paginate filtered list
  const totalPages = Math.ceil(filteredContratos.length / ITEMS_PER_PAGE) || 1;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [predictiveSearchTerm, searchTerm, appliedKeywords, selectedEstado, selectedTipo, selectedModalidad, selectedCategory, minValor, maxValor]);

  // Clamp current page if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedContratos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContratos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredContratos, currentPage]);

  // Generate list of page numbers to show with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    // Always show page 1
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('ellipsis-start');
    }
    
    // Middle pages
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis-end');
    }
    
    // Always show last page if more than 1 page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  const applyMontoFilter = () => {
    setMinValor(parseFormattedAmount(tempMinValor));
    setMaxValor(parseFormattedAmount(tempMaxValor));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setPredictiveSearchTerm('');
    setSearchTerm('');
    setKeywordsInput('');
    setAppliedKeywords([]);
    setSelectedEstado('');
    setSelectedTipo('');
    setSelectedModalidad('');
    setMinValor('');
    setMaxValor('');
    setTempMinValor('');
    setTempMaxValor('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  // Safe external URL parser for Socrata schema variants
  const getSecopUrl = (contrato: Contrato) => {
    if (!contrato.urlproceso) return null;
    if (typeof contrato.urlproceso === 'object' && contrato.urlproceso.url) {
      return contrato.urlproceso.url;
    }
    if (typeof contrato.urlproceso === 'string') {
      return contrato.urlproceso;
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in" id="contratos-section">
      
      {/* Filtering Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
        
        {/* Top Row: General Text Search & Keywords Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          
          {/* 1. General Text Search */}
          <div className="space-y-1">
            <label htmlFor="general-text-search-input" className="block text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Búsqueda por Texto
            </label>
            <div className="relative">
              <input
                id="general-text-search-input"
                type="text"
                placeholder="Buscar en todo el documento o texto..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-600/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs font-sans"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Limpiar búsqueda por texto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Keywords Search */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Filtrar por Palabras Clave
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ej: obra, salud, consultoria... (Máx. 10)"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyKeywords();
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-600/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs font-sans"
                />
                <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
              </div>
              <button
                type="button"
                onClick={handleApplyKeywords}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>
            </div>
          </div>

        </div>

        {/* Second Row: Predictive Search */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="space-y-1">
            <label htmlFor="predictive-search-input" className="block text-[11px] font-bold font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>Búsqueda Predictiva</span>
              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono font-bold border border-indigo-200 dark:border-indigo-800">Sugerencias Automáticas</span>
            </label>
            <PredictiveSearchBar
              contratos={contratos}
              searchTerm={predictiveSearchTerm}
              onSearchChange={(val) => {
                setPredictiveSearchTerm(val);
                setCurrentPage(1);
              }}
              placeholder="Buscar con sugerencias por proveedor, objeto, supervisor, ID o referencia..."
              id="predictive-search-input"
            />
          </div>
        </div>

        {/* Applied Filters & Quick Reset Bar */}
        {(predictiveSearchTerm || searchTerm || appliedKeywords.length > 0 || selectedEstado || selectedTipo || selectedModalidad || selectedCategory || minValor || maxValor) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filtros Activos:</span>
              
              {predictiveSearchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-mono font-medium">
                  <strong>Predictiva:</strong> {predictiveSearchTerm}
                  <button 
                    type="button" 
                    onClick={() => setPredictiveSearchTerm('')}
                    className="hover:bg-indigo-100 dark:hover:bg-indigo-900/60 p-0.5 rounded cursor-pointer"
                    title="Remover filtro predictivo"
                  >
                    <X className="w-3 h-3 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400" />
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-mono font-medium">
                  <strong>Texto:</strong> {searchTerm}
                  <button 
                    type="button" 
                    onClick={() => setSearchTerm('')}
                    className="hover:bg-amber-100 dark:hover:bg-amber-900/60 p-0.5 rounded cursor-pointer"
                    title="Remover filtro de texto"
                  >
                    <X className="w-3 h-3 text-amber-500 hover:text-amber-700 dark:text-amber-400" />
                  </button>
                </span>
              )}

              {appliedKeywords.map((kw, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono font-medium">
                  <strong>Palabra:</strong> {kw}
                  <button 
                    type="button" 
                    onClick={() => {
                      const newList = appliedKeywords.filter((_, i) => i !== idx);
                      setAppliedKeywords(newList);
                      setKeywordsInput(newList.join(', '));
                    }}
                    className="hover:bg-emerald-100 dark:hover:bg-emerald-900/60 p-0.5 rounded cursor-pointer"
                    title="Remover palabra clave"
                  >
                    <X className="w-3 h-3 text-emerald-500 hover:text-emerald-700 dark:text-emerald-400" />
                  </button>
                </span>
              ))}
            </div>

            <button
              onClick={resetFilters}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Reestablecer todo
            </button>
          </div>
        )}

        {/* Interactive Semáforo Quick Filters */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Filtrar rápido por Estado del Contrato (Semaforo)
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedEstado('')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                selectedEstado === ''
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:border-slate-100 shadow-xs scale-102'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              Todos los estados
            </button>
            {filterOptions.estados.map(est => {
              const config = getEstadoSemaforoConfig(est);
              const isSelected = selectedEstado === est;
              return (
                <button
                  key={est}
                  type="button"
                  onClick={() => setSelectedEstado(isSelected ? '' : est)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border font-mono tracking-wide transition-all cursor-pointer ${
                    isSelected
                      ? `${config.colorClass} border-slate-800 dark:border-slate-100 ring-2 ring-slate-800/10 dark:ring-white/10 scale-105 shadow-xs`
                      : `${config.colorClass} border-slate-200 dark:border-slate-850 opacity-60 hover:opacity-100 hover:scale-102`
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdowns Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          
          {/* Estado Contractual */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Estado Contractual
              <InfoTooltip content="Filtra por la situación jurídica actual del contrato (ej: En ejecución, Modificado, Cerrado, Liquidado)." />
            </label>
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100"
            >
              <option value="">Todos los estados</option>
              {filterOptions.estados.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Contrato */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Tipo de Contrato
              <InfoTooltip content="Filtra según la tipología del objeto contractual (ej: Prestación de Servicios, Suministro, Obra Pública)." />
            </label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100"
            >
              <option value="">Todos los tipos</option>
              {filterOptions.tipos.map(tp => (
                <option key={tp} value={tp}>{tp}</option>
              ))}
            </select>
          </div>

          {/* Modalidad de Contratación */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Modalidad de Contratación
              <InfoTooltip content="Filtra por el procedimiento de selección regulado empleado para elegir al proveedor (ej: Contratación Directa, Licitación)." />
            </label>
            <select
              value={selectedModalidad}
              onChange={(e) => setSelectedModalidad(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100"
            >
              <option value="">Todas las modalidades</option>
              {filterOptions.modalidades.map(md => (
                <option key={md} value={md}>{md}</option>
              ))}
            </select>
          </div>

          {/* Rango de Valores */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Monto Contratado / Cuantía ($ COP)
              <InfoTooltip content="Filtra por el rango de valor económico total (cuantía) establecido en la firma del contrato." />
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-mono font-bold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Valor Mínimo (ej: 1.000.000)"
                  value={tempMinValor}
                  onChange={(e) => setTempMinValor(formatInputAmount(e.target.value))}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg pl-6 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 transition-all font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
              <span className="text-slate-400 dark:text-slate-500 font-mono text-xs self-center">hasta</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-mono font-bold">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Valor Máximo (ej: 50.000.000)"
                  value={tempMaxValor}
                  onChange={(e) => setTempMaxValor(formatInputAmount(e.target.value))}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg pl-6 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 transition-all font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={applyMontoFilter}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs hover:shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-1"
                >
                  Filtrar por Monto
                </button>
                {(tempMinValor || tempMaxValor || minValor || maxValor) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempMinValor('');
                      setTempMaxValor('');
                      setMinValor('');
                      setMaxValor('');
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1"
                    title="Limpiar filtro de monto"
                  >
                    <RefreshCw className="w-3 h-3" /> Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Grid layout for Desktop: Left for Contracts list, Right for Categories Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start" id="contratos-grid-layout">
        
        {/* Left Column: Contracts list (3/4 width on desktop) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Contracts Counters & Meta */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Mostrando <span className="text-indigo-600 dark:text-indigo-400 font-bold font-sans">{filteredContratos.length}</span> contratos correspondientes a la consulta
              {selectedCategory && (
                <>
                  {' '}filtrados por la categoría <span className="text-indigo-600 dark:text-indigo-400 font-bold font-sans">"{gastosResumen.find(s => s.categoria.id === selectedCategory)?.categoria.label}"</span>
                </>
              )}
            </p>
          </div>

          {/* Contracts Cards List */}
          {paginatedContratos.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ningún contrato coincide</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">Pruebe modificando los términos de búsqueda o removiendo filtros selectivos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedContratos.map((contrato, idx) => {
                const absoluteIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                const secopUrl = getSecopUrl(contrato);
                return (
                  <div 
                    key={contrato.id_contrato}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-md rounded-2xl p-6 transition-all group flex flex-col md:flex-row justify-between gap-6 shadow-2xs animate-fade-in"
                  >
                    {/* Content block */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 text-[11px] font-bold font-mono shadow-3xs">
                          #{absoluteIndex} de {filteredContratos.length}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          ID: {contrato.id_contrato}
                        </span>
                        <div className="shrink-0 relative z-10 -ml-1">
                          <FavoriteButton contract={contrato} />
                        </div>
                        {contrato.referencia_del_contrato && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            Ref: {contrato.referencia_del_contrato}
                          </span>
                        )}
                        {renderEstadoSemaforo(contrato.estado_contrato || '')}
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Firma: {formatDate(contrato.fecha_de_firma)}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 line-clamp-2">
                          {normalizeName(contrato.proveedor_adjudicado)}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-450 font-mono mt-0.5">
                          Contratista Adjudicado | {contrato.tipodocproveedor || 'CC/NIT'}: {maskDocument(contrato.documento_proveedor || '', contrato.tipodocproveedor)}
                        </p>
                      </div>

                      <ObjetoContratoText objeto={contrato.objeto_del_contrato} />

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <div>
                          <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Referencia
                            <InfoTooltip content="Número o código de referencia asignado al contrato por la entidad o SECOP II." />
                          </div>
                          <div className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 truncate" title={contrato.referencia_del_contrato || 'No reportada'}>
                            {contrato.referencia_del_contrato || 'No reportada'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Modalidad
                            <InfoTooltip content="Procedimiento de selección regulado por ley empleado para contratar este servicio." />
                          </div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={contrato.modalidad_de_contratacion}>
                            {contrato.modalidad_de_contratacion}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Supervisor
                            <InfoTooltip content="Persona responsable de verificar la correcta ejecución técnica, financiera y legal del contrato." />
                          </div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={contrato.nombre_supervisor}>
                            {normalizeName(contrato.nombre_supervisor)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Monto Firma / Cuantía
                            <InfoTooltip content="El valor total pactado al suscribir originalmente el contrato (Cuantía)." />
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {formatCOP(contrato.valor_del_contrato)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Block */}
                    <div className="flex md:flex-col items-stretch justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-850 pt-4 md:pt-0 md:pl-6">
                      <button
                        onClick={() => setSelectedContract(contrato)}
                        className="flex-1 md:flex-none px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detalle
                      </button>
                      {secopUrl && (
                        <a
                          href={secopUrl}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          rel="noopener noreferrer"
                          className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          Ver SECOP <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav 
              aria-label="pagination" 
              className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800 gap-4"
              id="contratos-pagination-nav"
            >
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Página <span className="text-indigo-600 dark:text-indigo-400 font-bold font-sans">{currentPage}</span> de <span className="text-slate-800 dark:text-slate-200 font-bold font-sans">{totalPages}</span> ({filteredContratos.length} contratos en total)
              </p>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Ir a la página anterior"
                  className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition-all cursor-pointer shadow-3xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Page Number Buttons */}
                {getPageNumbers().map((page, index) => {
                  if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                    return (
                      <span 
                        key={`ellipsis-${index}`}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500"
                        aria-hidden="true"
                        title="Rango colapsado"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </span>
                    );
                  }

                  const pageNum = page as number;
                  const isCurrent = pageNum === currentPage;

                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      aria-current={isCurrent ? 'page' : undefined}
                      aria-label={`Ir a la página ${pageNum}`}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold font-mono rounded-lg transition-all cursor-pointer shadow-3xs ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border border-indigo-600'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Ir a la página siguiente"
                  className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition-all cursor-pointer shadow-3xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </nav>
          )}
        </div>

        {/* Right Column: Spending Categories Analytics (1/4 width on desktop) */}
        <div className="lg:sticky lg:top-6 space-y-6">
          <CategoriasGastosPanel
            summaries={gastosResumen}
            totalGastado={totalGastado}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

      </div>

      {/* Detailed Modal/Drawer */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl relative" id="contrato-detail-modal">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
              <div className="min-w-0 pr-6">
                <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Detalle Integral de Contrato</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate font-sans" title={selectedContract.proveedor_adjudicado}>
                  {normalizeName(selectedContract.proveedor_adjudicado)}
                </h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-455 mt-0.5">
                  ID: {selectedContract.id_contrato} | {selectedContract.tipodocproveedor || 'CC/NIT'}: {maskDocument(selectedContract.documento_proveedor || '', selectedContract.tipodocproveedor)} | Referencia: {selectedContract.referencia_del_contrato || 'No reportada'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado:</span>
                  {renderEstadoSemaforo(selectedContract.estado_contrato || '')}
                </div>
              </div>
              <button 
                onClick={() => setSelectedContract(null)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all cursor-pointer text-slate-400 dark:text-slate-550 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Información de consulta ciudadana */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3 shadow-2xs">
                <Info className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs uppercase font-mono tracking-wider">Información de consulta ciudadana</span>
                  <p className="leading-relaxed">
                    Este resultado se calcula a partir de los datos públicos disponibles en SECOP II. Es descriptivo y no constituye una conclusión sobre legalidad, cumplimiento, responsabilidad o irregularidad. Consulte el expediente oficial de cada contrato para ampliar la información.
                  </p>
                </div>
              </div>

              {/* Identificadores del Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs shadow-2xs">
                <div>
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Referencia del Contrato
                  </div>
                  <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 text-xs select-all">
                    {selectedContract.referencia_del_contrato || 'No reportada'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> ID del Contrato
                  </div>
                  <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 text-xs select-all">
                    {selectedContract.id_contrato}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Proceso de Compra
                  </div>
                  <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 text-xs select-all truncate" title={selectedContract.proceso_de_compra || 'No especificado'}>
                    {selectedContract.proceso_de_compra || 'No especificado'}
                  </div>
                </div>
              </div>

              {/* Objeto del Contrato */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Objeto del Contrato
                </h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line shadow-2xs">
                  {selectedContract.objeto_del_contrato}
                </div>
              </div>

              {/* Grid 1: Fechas y plazos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Fecha de Firma
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedContract.fecha_de_firma)}</div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-455" /> Inicio de Contrato
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedContract.fecha_de_inicio_del_contrato)}</div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 shadow-2xs">
                  <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-455" /> Fin de Contrato
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDate(selectedContract.fecha_de_fin_del_contrato)}</div>
                </div>
              </div>

              {/* Grid 2: Aspectos financieros detallados */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Balance Financiero Reportado
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Monto de Firma</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {formatCOP(selectedContract.valor_del_contrato)}
                    </div>
                  </div>
                  <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Monto Pagado</div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-450 mt-1">
                      {formatCOP(selectedContract.valor_pagado)}
                    </div>
                  </div>
                  <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Pendiente de Pago</div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-450 mt-1">
                      {formatCOP(selectedContract.valor_pendiente_de_pago)}
                    </div>
                  </div>
                  <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">Pendiente de Ejecución</div>
                    <div className="text-sm font-bold text-slate-600 dark:text-slate-405 mt-1">
                      {formatCOP(selectedContract.valor_pendiente_de_ejecucion)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 3: Detalles legales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-white dark:bg-slate-900 shadow-2xs">
                  <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Régimen y Justificación
                  </h5>
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Modalidad de Contratación:</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{selectedContract.modalidad_de_contratacion}</div>
                  </div>
                  {selectedContract.justificacion_modalidad_de && (
                    <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Justificación de Modalidad:</div>
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-snug">{selectedContract.justificacion_modalidad_de}</div>
                    </div>
                  )}
                </div>

                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 bg-white dark:bg-slate-900 shadow-2xs">
                  <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-450" /> Supervisión y Control
                  </h5>
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Supervisor Designado:</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{normalizeName(selectedContract.nombre_supervisor)}</div>
                  </div>
                  {selectedContract.nombre_ordenador_del_gasto && (
                    <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">Ordenador del Gasto:</div>
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{normalizeName(selectedContract.nombre_ordenador_del_gasto)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Clasificación y Estructura de la Entidad (Nuevos campos SECOP II) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
                <h5 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Clasificación y Estructura de la Entidad
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Orden Administrativo</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.orden || 'No especificado'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Régimen Centralización</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.entidad_centralizada || 'No especificado'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Sector de Actividad</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.sector || 'No especificado'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[9px] uppercase tracking-wider">Rama del Poder</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.rama || 'No especificado'}</div>
                  </div>
                </div>
                {selectedContract.localizaci_n && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span className="font-bold font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Ubicación del Registro de la Entidad:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{selectedContract.localizaci_n}</span>
                  </div>
                )}
              </div>

              {/* Datos Técnicos y Plazos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs shadow-2xs">
                <div>
                  <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[10px] uppercase tracking-widest">Duración Original</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.duraci_n_del_contrato} días</div>
                </div>
                <div>
                  <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[10px] uppercase tracking-widest">Días Adicionados</div>
                  <div className={`font-bold mt-0.5 ${(Number(selectedContract.dias_adicionados) || 0) > 0 ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-800 dark:text-slate-200'}`}>
                    {selectedContract.dias_adicionados} días
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 dark:text-slate-500 font-bold font-mono text-[10px] uppercase tracking-widest">Prorrogable</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedContract.el_contrato_puede_ser_prorrogado || 'No especificado'}</div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => setSelectedContract(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20 transition-all cursor-pointer shadow-2xs bg-white dark:bg-slate-900"
              >
                Cerrar Ventana
              </button>
              {getSecopUrl(selectedContract) && (
                <a
                  href={getSecopUrl(selectedContract)!}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  Ir al Expediente SECOP II <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
