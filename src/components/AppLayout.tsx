import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Database, Moon, Sun, Sparkles, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useVersionUpdate } from '../hooks/useVersionUpdate';

interface AppLayoutProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  handleClearCache: () => Promise<void>;
}

export default function AppLayout({
  children,
  theme,
  toggleTheme,
  handleClearCache,
}: AppLayoutProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const lastScrollY = useRef(0);

  const {
    localVersion,
    latestVersionInfo,
    hasUpdate,
    checking,
    upToDateNotice,
    lastChecked,
    checkVersion,
    applyUpdate,
    skipUpdate,
    dismissUpToDateNotice
  } = useVersionUpdate();
  const [updating, setUpdating] = useState(false);

  const handleUpdateClick = () => {
    setUpdating(true);
    applyUpdate();
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Determine if scrolling up or down
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setIsScrollingUp(false);
      } else {
        setIsScrollingUp(true);
      }

      setScrollY(currentScrollY);
      lastScrollY.current = currentScrollY;

      // Determine if reached bottom of the page
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollPosition = currentScrollY + windowHeight;
      
      // Since layout is static, documentHeight is stable.
      // Trigger footer content fade-in when user is within 150px of the very bottom of the scrollable area.
      setIsAtBottom(documentHeight - scrollPosition <= 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial calculation
    setTimeout(handleScroll, 100);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isScrolled = scrollY > 20;

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white"
      id="main-app-container"
    >
      {/* Top Banner / Navbar (Smart Header) */}
      <header
        className={`border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs py-2 sm:py-2.5'
            : 'bg-white dark:bg-slate-900 shadow-sm py-3 sm:py-3.5'
        } ${
          // Mobile responsive smart hiding/showing behavior
          !isScrollingUp && scrollY > 100 ? '-translate-y-full md:translate-y-0' : 'translate-y-0'
        }`}
      >
        <div className="w-full sm:w-[95%] lg:w-[92%] [@media(min-width:1600px)]:max-w-[1600px] [@media(min-width:1700px)]:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Logo and title with smooth transition sizes */}
          <div className="flex items-center gap-2.5 transition-all duration-300">
            <div
              className={`bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 transition-all duration-300 ${
                isScrolled ? 'p-1.5' : 'p-2.5'
              }`}
            >
              <ShieldCheck className={`transition-all duration-300 ${isScrolled ? 'w-5 h-5' : 'w-6 h-6 sm:w-7 h-7'}`} />
            </div>
            <div className="space-y-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans leading-none">
                Contrato-Claro
              </h1>
              <p
                className={`text-xs text-slate-500 dark:text-slate-450 font-medium transition-all duration-300 ${
                  isScrolled
                    ? 'max-h-0 opacity-0 overflow-hidden mt-0'
                    : 'max-h-12 opacity-100 mt-1'
                }`}
              >
                Comprender la contratación pública nunca fue tan sencillo.
              </p>
            </div>
          </div>

          {/* Actions & Socrata status */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div
              className={`text-right hidden md:block transition-all duration-300 ${
                isScrolled ? 'opacity-0 scale-95 w-0 pointer-events-none overflow-hidden' : 'opacity-100 scale-100'
              }`}
            >
              <div className="text-[10px] font-mono text-slate-450 dark:text-slate-500 flex items-center gap-1 justify-end">
                <Database className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Datos Oficiales
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">SECOP II</div>
            </div>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 rounded-xl text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 transition-all shadow-xs cursor-pointer text-xs font-semibold"
              title={theme === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
              id="theme-toggle-btn"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Modo Oscuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Modo Claro</span>
                </>
              )}
            </button>

            {/* Check for Updates Button */}
            <button
              onClick={() => checkVersion(true)}
              disabled={checking}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              title="Buscar actualizaciones (verificación automática cada 2 horas)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">{checking ? 'Buscando...' : 'Actualizaciones'}</span>
            </button>

            {/* Clear Cache Button */}
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 transition-all shadow-xs cursor-pointer"
              title="Limpiar caché IndexedDB"
            >
              Limpiar Caché
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 w-full sm:w-[95%] lg:w-[92%] [@media(min-width:1600px)]:max-w-[1600px] [@media(min-width:1700px)]:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {children}
      </main>

      {/* Smart Footer (Stable layout dimensions, content slides up and fades in cleanly only at the bottom) */}
      <footer className="bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80 py-12 mt-16">
        <div className={`w-full sm:w-[95%] lg:w-[92%] [@media(min-width:1600px)]:max-w-[1600px] [@media(min-width:1700px)]:max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-in-out ${
          isAtBottom ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-200 dark:border-slate-800/60">
            
            {/* Columna 1: Contrato-Claro */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
                Contrato-Claro
              </h3>
              <p className="text-slate-500 dark:text-slate-450 leading-relaxed max-w-sm">
                Plataforma abierta de datos abiertos para fortalecer el control ciudadano.
              </p>
            </div>

            {/* Columna 2: Texto Legal */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold font-mono text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                Aviso Legal
              </h4>
              <p className="text-slate-500 dark:text-slate-450 leading-relaxed text-[11px]">
                Los datos mostrados provienen de fuentes públicas oficiales. Contrato-Claro facilita su consulta y análisis, pero no modifica ni sustituye la información publicada por las entidades responsables.
              </p>
            </div>

            {/* Columna 3: Fuente de Datos */}
            <div className="space-y-2.5 md:pl-4">
              <h4 className="text-[10px] font-bold font-mono text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                Fuente de datos
              </h4>
              <div className="space-y-1">
                <p className="text-slate-800 dark:text-slate-200 font-bold font-mono">SECOP II</p>
                <p className="text-slate-500 dark:text-slate-450">API Datos Abiertos</p>
              </div>
            </div>

          </div>

          {/* Parte Inferior */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 dark:text-slate-500 text-[11px]">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 font-mono">
              <span className="font-bold text-slate-650 dark:text-slate-400">Community Edition ({localVersion})</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-800">•</span>
              <span>MIT License</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-800">•</span>
              <span>© 2026 Contrato-Claro</span>
            </div>
            <div className="text-center md:text-right">
              <span>No afiliado al Gobierno de Colombia.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom micro-bar (shows with the footer, with stable layout) */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-300 dark:text-slate-450 text-[10px] font-mono py-2.5 px-4 text-center border-t border-slate-850 font-semibold tracking-wider flex items-center justify-center select-none uppercase">
        <div className={`flex items-center justify-center gap-1.5 transition-all duration-500 ease-in-out ${
          isAtBottom ? 'opacity-100' : 'opacity-0'
        }`}>
          <span>Software libre</span>
          <span className="text-indigo-500 font-bold">•</span>
          <span>Código Abierto</span>
          <span className="text-indigo-500 font-bold">•</span>
          <span>Datos Oficiales SECOP II</span>
        </div>
      </div>

      {/* Floating Update Notification Banner */}
      {hasUpdate && latestVersionInfo && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 animate-fade-in flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  ¡Nueva Versión Disponible!
                </h4>
                <p className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-indigo-100 dark:border-indigo-900/40">
                  {latestVersionInfo.version} (Actual: {localVersion})
                </p>
              </div>
            </div>
            <button
              onClick={skipUpdate}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450">¿Qué hay de nuevo en esta actualización?</p>
            <div className="max-h-28 overflow-y-auto pr-1.5 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 custom-scrollbar">
              {latestVersionInfo.changelog && latestVersionInfo.changelog.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start leading-relaxed text-left">
                  <span className="text-indigo-500 font-bold shrink-0 mt-1">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleUpdateClick}
              disabled={updating}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
              <span>{updating ? 'Actualizando...' : 'Actualizar Ahora'}</span>
            </button>
            <button
              onClick={skipUpdate}
              className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer"
            >
              Luego
            </button>
          </div>
        </div>
      )}

      {/* Up-To-Date Toast Notification */}
      {upToDateNotice && !hasUpdate && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[90vw] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl shadow-xl p-4 animate-fade-in flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                ¡Aplicación Actualizada!
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                Estás en la versión más reciente <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">({localVersion})</span>. No hay nuevas actualizaciones pendientes.
              </p>
              {lastChecked && (
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                  Comprobado a las: {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={dismissUpToDateNotice}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
