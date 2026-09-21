import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Database, Moon, Sun, Sparkles, X, CheckCircle2, Eye, Compass, HelpCircle, User, Star } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  easyRead?: boolean;
  toggleEasyRead?: () => void;
  handleClearCache: () => Promise<void>;
  onOpenOnboarding?: () => void;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onOpenFavorites?: () => void;
}

export default function AppLayout({
  children,
  theme,
  toggleTheme,
  easyRead = false,
  toggleEasyRead,
  handleClearCache,
  onOpenOnboarding,
  onOpenAuth,
  onOpenProfile,
  onOpenFavorites,
}: AppLayoutProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const lastScrollY = useRef(0);

  const token = localStorage.getItem('token');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('token'));
  }, []);



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
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500/25 dark:selection:bg-indigo-500/35 selection:text-current"
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

            {/* Modo Lectura Fácil (Alto Contraste) Button */}
            {toggleEasyRead && (
              <button
                onClick={toggleEasyRead}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl transition-all shadow-xs cursor-pointer text-xs font-bold ${
                  easyRead
                    ? 'border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-400 ring-2 ring-amber-400/50'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900'
                }`}
                title={easyRead ? 'Desactivar Modo Lectura Fácil (Alto Contraste)' : 'Activar Modo Lectura Fácil (Alto Contraste y Accesibilidad)'}
                id="easy-read-toggle-btn"
                aria-pressed={easyRead}
              >
                <Eye className={`w-4 h-4 ${easyRead ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <span className="hidden sm:inline">Lectura Fácil</span>
                {easyRead && (
                  <span className="bg-amber-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ml-0.5">
                    ON
                  </span>
                )}
              </button>
            )}

            {/* Guía / Onboarding Tutorial Button */}
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-600 dark:hover:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                title="Abrir Tutorial Interactivo y Guía de Uso (Ctrl + H)"
                id="onboarding-guide-header-btn"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:rotate-45 transition-transform duration-300" />
                <span className="hidden sm:inline">Guía de Uso</span>
                <span className="hidden lg:inline text-[9px] font-mono bg-indigo-100/90 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 ml-0.5 font-bold">Ctrl+H</span>
              </button>
            )}

            {/* Clear Cache Button */}
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-400 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 transition-all shadow-xs cursor-pointer"
              title="Limpiar caché local"
            >
              Limpiar Caché
            </button>

            {/* Auth Button */}
            {isAuthenticated ? (
              <>
                <button
                  onClick={onOpenFavorites}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 dark:border-amber-900/60 hover:border-amber-500 dark:hover:border-amber-400 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                  title="Favoritos"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                  <span className="hidden sm:inline">Favoritos</span>
                </button>
                <button
                  onClick={onOpenProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-600 dark:hover:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                title="Mi Perfil"
              >
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="hidden sm:inline">Mi Perfil</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-600 dark:hover:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                title="Iniciar Sesión"
              >
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
            )}
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
                La forma más clara de entender la contratación pública en Colombia.
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
                <p className="text-slate-500 dark:text-slate-450">Sistema de Contratación Pública</p>
              </div>
            </div>

          </div>

          {/* Parte Inferior */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 dark:text-slate-500 text-[11px]">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-2 font-mono">
              <span>© 2026 Contrato-Claro</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-800">•</span>
              <a href="https://github.com/kcrsromero-cmyk/Contrato-Cla/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                Licencia AGPLv3 ↗
              </a>
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
          <span>Contratación Pública</span>
          <span className="text-indigo-500 font-bold">•</span>
          <span>Colombia</span>
          <span className="text-indigo-500 font-bold">•</span>
          <span>Datos Oficiales SECOP II</span>
        </div>
      </div>

      {/* Minimized Floating Interactive Guide Launcher Button with Hover Tooltip */}
      {onOpenOnboarding && (
        <div className="fixed bottom-6 left-6 z-40 group">
          {/* Tooltip on Hover */}
          <div className="absolute bottom-full left-0 mb-2.5 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-200 pointer-events-none flex items-center gap-2 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold rounded-xl shadow-xl border border-slate-700/80 dark:border-slate-600/80 whitespace-nowrap z-50 backdrop-blur-md">
            <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Guía Interactiva</span>
            <span className="font-mono text-[10px] text-indigo-300 bg-slate-800 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700/80 font-bold">Ctrl+H</span>
          </div>

          {/* Minimized Circular Button */}
          <button
            onClick={onOpenOnboarding}
            className="w-10 h-10 bg-slate-900/90 dark:bg-slate-800/90 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-white rounded-full shadow-xl border border-slate-700/80 dark:border-slate-600/80 backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Abrir Guía Interactiva (Ctrl + H)"
            id="onboarding-guide-floating-btn"
          >
            <Compass className="w-5 h-5 text-indigo-400 group-hover:text-white group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>
      )}
    </div>
  );
}
