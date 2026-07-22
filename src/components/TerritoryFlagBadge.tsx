import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useWikipediaFlag } from '../hooks/useWikipediaFlag';
import { WikipediaSymbol } from '../services/wikipediaService';
import { ExternalLink, Flag, Info, X, Shield, Sparkles } from 'lucide-react';

interface TerritoryFlagBadgeProps {
  ciudad?: string;
  departamento?: string;
  variant?: 'hero' | 'compact' | 'card';
  className?: string;
}

export default function TerritoryFlagBadge({
  ciudad,
  departamento,
  variant = 'hero',
  className = '',
}: TerritoryFlagBadgeProps) {
  const { citySymbol, deptSymbol, loading } = useWikipediaFlag(ciudad, departamento);
  const [activeModalSymbol, setActiveModalSymbol] = useState<WikipediaSymbol | null>(null);

  // Active primary symbol (prefer city symbol if available, else department)
  const primarySymbol = citySymbol || deptSymbol;
  const secondarySymbol = citySymbol && deptSymbol && citySymbol.img !== deptSymbol.img ? deptSymbol : null;

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 animate-pulse text-[10px] text-slate-400 font-mono ${className}`}>
        <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        <span>Cargando insignia Wikipedia...</span>
      </div>
    );
  }

  if (!primarySymbol) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <>
        <div className={`inline-flex items-center gap-2 ${className}`}>
          <button
            type="button"
            onClick={() => setActiveModalSymbol(primarySymbol)}
            className="group flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 hover:bg-indigo-50/80 dark:hover:bg-slate-800 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all cursor-pointer text-left"
            title={`Ver detalles de ${primarySymbol.title} en Wikipedia`}
          >
            <div className="relative w-4 h-4 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
              <img
                src={primarySymbol.img}
                alt={primarySymbol.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[10px] font-bold font-mono text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate max-w-[120px]">
              {primarySymbol.locationName}
            </span>
            <span className="text-[9px] px-1 py-0.2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono font-bold rounded">
              Wiki
            </span>
          </button>
        </div>

        {/* Modal viewer */}
        {activeModalSymbol && (
          <SymbolModal symbol={activeModalSymbol} onClose={() => setActiveModalSymbol(null)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className={`inline-flex flex-wrap items-center gap-2 max-w-full ${className}`}>
        {/* Main Badge Button */}
        <button
          type="button"
          onClick={() => setActiveModalSymbol(primarySymbol)}
          className="group relative flex items-center gap-2 p-1.5 pr-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md hover:bg-indigo-50/90 dark:hover:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer text-left max-w-full min-w-0"
        >
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-3xs">
            <img
              src={primarySymbol.img}
              alt={primarySymbol.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 shrink-0" /> Wikipedia Insignia
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[200px] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" title={primarySymbol.title}>
              {primarySymbol.title}
            </div>
          </div>
        </button>

        {/* Secondary symbol button if department has distinct symbol */}
        {secondarySymbol && (
          <button
            type="button"
            onClick={() => setActiveModalSymbol(secondarySymbol)}
            className="group flex items-center gap-1.5 p-1.5 pr-2.5 bg-white/80 dark:bg-slate-900/80 hover:bg-indigo-50/80 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-3xs transition-all duration-200 cursor-pointer text-left shrink-0"
          >
            <div className="relative w-6 h-6 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
              <img
                src={secondarySymbol.img}
                alt={secondarySymbol.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[90px]">
              {secondarySymbol.locationName}
            </span>
          </button>
        )}
      </div>

      {/* Modal viewer */}
      {activeModalSymbol && (
        <SymbolModal symbol={activeModalSymbol} onClose={() => setActiveModalSymbol(null)} />
      )}
    </>
  );
}

interface SymbolModalProps {
  symbol: WikipediaSymbol;
  onClose: () => void;
}

function SymbolModal({ symbol, onClose }: SymbolModalProps) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in text-left custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
          <Flag className="w-4 h-4" /> Insignia Territorial Oficial
        </div>

        {/* Enlarged Flag Image Display */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center p-3">
          <img
            src={symbol.img}
            alt={symbol.title}
            className="max-w-full max-h-full object-contain rounded-lg drop-shadow-md"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">
            {symbol.title}
          </h3>

          {symbol.description && (
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono capitalize">
              {symbol.description}
            </p>
          )}

          {symbol.extract && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-4 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
              "{symbol.extract}"
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
            Fuente: Wikipedia API
          </span>

          {symbol.pageUrl && (
            <a
              href={symbol.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-mono transition-colors shadow-2xs"
            >
              <span>Ver en Wikipedia</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
