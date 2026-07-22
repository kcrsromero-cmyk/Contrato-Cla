import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Building, FileText, User, Hash, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { Contrato } from '../types';

interface PredictiveSuggestion {
  id: string;
  type: 'proveedor' | 'objeto' | 'supervisor' | 'referencia';
  label: string;
  sublabel?: string;
  matchCount: number;
  searchValue: string;
}

interface PredictiveSearchBarProps {
  contratos: Contrato[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

const RECENT_SEARCHES_KEY = 'contrato_claro_recent_searches_v1';

const normalizeStr = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export default function PredictiveSearchBar({
  contratos,
  searchTerm,
  onSearchChange,
  placeholder = 'Buscar por objeto, proveedor, supervisor, ID o referencia...',
  id = 'predictive-search-input'
}: PredictiveSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : ['Prestación de servicios', 'Suministro', 'Consultoría'];
    } catch {
      return ['Prestación de servicios', 'Suministro', 'Consultoría'];
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save query to search history
  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore quota errors
      }
      return updated;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== item);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  // Predictive Engine: Extract matching suggestions from active contracts dataset
  const suggestions = useMemo<PredictiveSuggestion[]>(() => {
    const qNorm = normalizeStr(searchTerm);
    if (!qNorm || qNorm.length < 2 || !contratos || contratos.length === 0) {
      return [];
    }

    const items: PredictiveSuggestion[] = [];

    // 1. Match Proveedores / Contratistas
    const proveedorMap = new Map<string, { original: string; count: number }>();
    for (const c of contratos) {
      if (!c.proveedor_adjudicado) continue;
      const provNorm = normalizeStr(c.proveedor_adjudicado);
      if (provNorm.includes(qNorm)) {
        const existing = proveedorMap.get(provNorm);
        if (existing) {
          existing.count++;
        } else {
          proveedorMap.set(provNorm, { original: c.proveedor_adjudicado.trim(), count: 1 });
        }
      }
    }

    const topProveedores = Array.from(proveedorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    for (const p of topProveedores) {
      items.push({
        id: `prov-${p.original}`,
        type: 'proveedor',
        label: p.original,
        matchCount: p.count,
        searchValue: p.original,
      });
    }

    // 2. Match Objeto del Contrato
    const objetoMatches: { original: string; count: number }[] = [];
    const seenObjetos = new Set<string>();

    for (const c of contratos) {
      if (!c.objeto_del_contrato) continue;
      const objNorm = normalizeStr(c.objeto_del_contrato);
      if (objNorm.includes(qNorm)) {
        // Truncate clean string for display if needed
        const cleanObj = c.objeto_del_contrato.trim();
        const first60 = cleanObj.length > 70 ? cleanObj.substring(0, 70) + '...' : cleanObj;
        if (!seenObjetos.has(first60.toLowerCase())) {
          seenObjetos.add(first60.toLowerCase());
          objetoMatches.push({ original: cleanObj, count: 1 });
        }
      }
      if (objetoMatches.length >= 3) break;
    }

    for (const o of objetoMatches) {
      items.push({
        id: `obj-${o.original.substring(0, 20)}`,
        type: 'objeto',
        label: o.original,
        searchValue: o.original,
        matchCount: 1,
      });
    }

    // 3. Match Supervisors
    const supervisorMap = new Map<string, { original: string; count: number }>();
    for (const c of contratos) {
      if (!c.nombre_supervisor) continue;
      const supNorm = normalizeStr(c.nombre_supervisor);
      if (supNorm.includes(qNorm)) {
        const existing = supervisorMap.get(supNorm);
        if (existing) {
          existing.count++;
        } else {
          supervisorMap.set(supNorm, { original: c.nombre_supervisor.trim(), count: 1 });
        }
      }
    }

    const topSupervisores = Array.from(supervisorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);

    for (const s of topSupervisores) {
      items.push({
        id: `sup-${s.original}`,
        type: 'supervisor',
        label: s.original,
        matchCount: s.count,
        searchValue: s.original,
      });
    }

    // 4. Match Referencias or IDs
    const refMatches: { ref: string; type: 'referencia' | 'id' }[] = [];
    for (const c of contratos) {
      if (c.referencia_del_contrato && normalizeStr(c.referencia_del_contrato).includes(qNorm)) {
        refMatches.push({ ref: c.referencia_del_contrato.trim(), type: 'referencia' });
      } else if (c.id_contrato && normalizeStr(c.id_contrato).includes(qNorm)) {
        refMatches.push({ ref: c.id_contrato.trim(), type: 'id' });
      }
      if (refMatches.length >= 2) break;
    }

    for (const r of refMatches) {
      items.push({
        id: `ref-${r.ref}`,
        type: 'referencia',
        label: r.ref,
        searchValue: r.ref,
        matchCount: 1,
      });
    }

    return items;
  }, [searchTerm, contratos]);

  const handleSelectSuggestion = (val: string) => {
    onSearchChange(val);
    saveRecentSearch(val);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex].searchValue);
      } else if (searchTerm.trim()) {
        saveRecentSearch(searchTerm);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const renderTypeBadge = (type: PredictiveSuggestion['type']) => {
    switch (type) {
      case 'proveedor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold border border-amber-200 dark:border-amber-800">
            <Building className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Proveedor
          </span>
        );
      case 'objeto':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold border border-indigo-200 dark:border-indigo-800">
            <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Objeto
          </span>
        );
      case 'supervisor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold border border-emerald-200 dark:border-emerald-800">
            <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Supervisor
          </span>
        );
      case 'referencia':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold border border-slate-200 dark:border-slate-700">
            <Hash className="w-3 h-3 text-slate-500" /> Ref/ID
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Field */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-600/20 dark:focus:ring-indigo-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs font-sans"
        />
        <Search className="absolute left-3.5 w-4.5 h-4.5 text-slate-400 dark:text-slate-500 pointer-events-none" />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Predictive Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-fade-in divide-y divide-slate-100 dark:divide-slate-800/60">
          
          {/* Header indicator */}
          <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3 h-3" /> Búsqueda Predictiva En Tiempo Real
            </span>
            <span>{contratos.length} Contratos Indexados</span>
          </div>

          {/* Predictions list */}
          {suggestions.length > 0 ? (
            <div className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((sug, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug.searchValue)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {renderTypeBadge(sug.type)}
                        {sug.matchCount > 1 && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
                            ({sug.matchCount} coincidencias)
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold line-clamp-2 leading-snug">
                        {sug.label}
                      </p>
                    </div>
                    <ArrowRight className={`w-4 h-4 shrink-0 mt-1 transition-transform ${isSelected ? 'translate-x-0.5 text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          ) : searchTerm.trim().length >= 2 ? (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-sans">
              No se encontraron sugerencias predictivas para "<strong className="text-slate-800 dark:text-slate-200">{searchTerm}</strong>".
              <p className="text-[11px] text-slate-400 mt-1">Presione Enter o use los filtros de palabras clave para buscar de todos modos.</p>
            </div>
          ) : null}

          {/* Recent Searches / Popular Suggestions */}
          {recentSearches.length > 0 && (
            <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" /> Búsquedas Recientes / Populares
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-300 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer shadow-2xs group/chip"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(e, item)}
                      className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 p-0.5 rounded"
                      title="Eliminar historial"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer keyboard hint */}
          <div className="px-3.5 py-2 bg-slate-100/60 dark:bg-slate-950 text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between">
            <span>Use ↑ ↓ para navegar · Enter para seleccionar</span>
            <span>Esc para cerrar</span>
          </div>

        </div>
      )}
    </div>
  );
}
