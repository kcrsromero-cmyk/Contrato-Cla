import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { EntidadResumen, Contrato } from '../types';
import { ShieldCheck, MapPin, Landmark, Award, ArrowUpRight } from 'lucide-react';
import { formatCOP } from '../utils/helpers';
import { InfoTooltip } from './InfoTooltip';

interface ParallaxHeroProps {
  selectedEntity: EntidadResumen;
  contratos: Contrato[];
}

export default function ParallaxHero({ selectedEntity, contratos }: ParallaxHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Detect prefers-reduced-motion to safely bypass parallax animations
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Set up scroll hooks
  const { scrollY } = useScroll();

  // Create different translate velocities for layered depth
  // Background layer translates slower (remains more static)
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);
  const bgOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);

  // Midground layer translates moderately
  const midY = useTransform(scrollY, [0, 500], [0, -40]);
  const midOpacity = useTransform(scrollY, [0, 400], [1, 0.2]);

  // Foreground (content) translates normally or slightly faster
  const fgY = useTransform(scrollY, [0, 500], [0, -80]);

  // Apply fallback (no translation) if user prefers reduced motion
  const finalBgY = prefersReducedMotion ? 0 : bgY;
  const finalBgOpacity = prefersReducedMotion ? 1 : bgOpacity;
  const finalMidY = prefersReducedMotion ? 0 : midY;
  const finalMidOpacity = prefersReducedMotion ? 1 : midOpacity;
  const finalFgY = prefersReducedMotion ? 0 : fgY;

  // Calculate metrics
  const totalAmount = contratos.reduce((sum, c) => sum + (Number(c.valor_del_contrato) || 0), 0);
  const totalContracts = contratos.length;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-auto min-h-[360px] sm:min-h-0 sm:h-[320px] md:h-[300px] lg:h-[320px] rounded-3xl overflow-hidden border border-slate-200/85 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-md flex items-center transition-colors duration-300"
      id="parallax-scrolling-hero"
    >
      {/* 1. LAYER 1: DEEP BACKGROUND (Translates slower) */}
      <motion.div 
        style={{ y: finalBgY, opacity: finalBgOpacity }}
        className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
      >
        {/* Dynamic mesh gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-all duration-300" />
        
        {/* Abstract glowing blobs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl" />
        
        {/* Topography vector-grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-40 dark:opacity-25" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-800" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </motion.div>

      {/* 2. LAYER 2: MIDGROUND (Floating items translating at mid-speed) */}
      <motion.div 
        style={{ y: finalMidY, opacity: finalMidOpacity }}
        className="absolute inset-0 z-10 pointer-events-none select-none flex items-center justify-between px-10"
      >
        {/* Large abstract transparent icon badge on the right - Hidden on small viewports */}
        <div className="hidden lg:block absolute right-24 top-1/2 -translate-y-1/2 opacity-15">
          <Landmark className="w-64 h-64 text-indigo-600/10 dark:text-indigo-400/10 stroke-[1]" />
        </div>
      </motion.div>

      {/* 3. LAYER 3: FOREGROUND (Animated with entry transitions, completely stable during scroll) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-20 w-full px-6 sm:px-10 py-6 sm:py-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        {/* Active entity title & details */}
        <div className="space-y-4 max-w-2xl text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-400/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold font-mono uppercase tracking-wider">
              {selectedEntity.orden === 'Territorial' ? 'Orden Territorial' : selectedEntity.orden || 'Nacional'}
            </span>
            {selectedEntity.nit_entidad && (
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                NIT: {selectedEntity.nit_entidad}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {selectedEntity.nombre_entidad}
            </h2>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium">
              <MapPin className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span>{selectedEntity.ciudad || 'Colombia'}, {selectedEntity.departamento}</span>
            </div>
          </div>
        </div>

        {/* Quick analytics card in foreground - Stacked layout to prevent overlaps */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:w-80 shadow-md dark:shadow-xl space-y-4 text-left transition-colors duration-300 shrink-0">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Contratación Activa
            </span>
            <div className="flex items-center gap-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">
              En Tiempo Real <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <span className="block text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider items-center">
                Monto Firmado
                <InfoTooltip 
                  content="Valor total acumulado de la contratación celebrada por la entidad pública en esta vigencia." 
                  calculation="Suma de las cuantías oficiales de los contratos vigentes."
                />
              </span>
              <span className="block text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono tracking-tight leading-tight break-all">
                {formatCOP(totalAmount)}
              </span>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex items-center justify-between">
              <div>
                <span className="block text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider items-center">
                  Total Contratos
                  <InfoTooltip 
                    content="Número de procesos contractuales suscritos formalmente." 
                    calculation="Conteo directo de contratos únicos registrados en la plataforma."
                  />
                </span>
                <span className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 font-mono">
                  {totalContracts.toLocaleString('es-CO')} {totalContracts === 1 ? 'contrato' : 'contratos'}
                </span>
              </div>
              <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                COP
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
