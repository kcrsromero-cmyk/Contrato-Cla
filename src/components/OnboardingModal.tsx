import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Compass, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Filter, 
  BarChart3, 
  ShieldAlert, 
  Database,
  Sparkles,
  ArrowRight,
  Search,
  FileText,
  Users,
  Keyboard
} from 'lucide-react';
import { DashboardTab } from '../hooks/useDashboard';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: DashboardTab) => void;
  onFocusTerritorial?: () => void;
  onFocusPeriod?: () => void;
  easyRead?: boolean;
}

export interface TourStep {
  id: string;
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  keyPoints: string[];
  targetTab?: DashboardTab;
  actionText?: string;
  calloutQuestion?: string;
  interactivePreview: React.ReactNode;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  onNavigateTab,
  onFocusTerritorial,
  onFocusPeriod,
  easyRead = false
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset to step 0 when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const steps: TourStep[] = [
    {
      id: 'territorial',
      title: 'Búsqueda y Selección Territorial',
      badge: 'Paso 1 de 7 · Cobertura SECOP II',
      icon: MapPin,
      description: 'Consulta información oficial de contratación pública en Colombia seleccionando Departamento y Municipio o buscando por NIT/Nombre oficial.',
      keyPoints: [
        'Filtre por cualquier departamento y alcaldía de Colombia.',
        'Soporta Búsqueda Avanzada por NIT de entidades o contratistas.',
        'Conexión en tiempo real con el portal de Datos Abiertos de Colombia.'
      ],
      actionText: 'Explorar Selector Territorial',
      interactivePreview: (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-mono text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold">Selector Territorial</span>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold">SECOP II</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold text-[11px] truncate">Antioquia</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-[11px] truncate">Medellín</span>
            </div>
          </div>
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-indigo-900 dark:text-indigo-200 text-[11px] flex items-center justify-between font-medium">
            <span>Alcaldía de Medellín</span>
            <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">1,420 Contratos</span>
          </div>
        </div>
      )
    },
    {
      id: 'periodo',
      title: 'Lente de Análisis Temporal',
      badge: 'Paso 2 de 7 · Acoplamiento por Fechas',
      icon: Calendar,
      description: 'Filtre el volumen contractual por año de vigencia (2024, 2025...), trimestres o meses específicos para analizar tendencias históricas.',
      keyPoints: [
        'Sincroniza todas las pestañas e indicadores al mes o año seleccionado.',
        'Soporta comparativas mensuales de firma y adiciones presupuestales.',
        'Mantiene el contexto temporal al cambiar entre vistas.'
      ],
      actionText: 'Probar Lente Temporal',
      interactivePreview: (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-mono text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold">Filtro de Período</span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-full font-mono font-bold">2025</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'].map((m, i) => (
              <div 
                key={m} 
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold shrink-0 border ${
                  i === 2 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {m}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
            <span>Filtro activo: <strong className="text-slate-900 dark:text-white font-bold">Marzo 2025</strong></span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">103 Contratos</span>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard-tabs',
      title: 'Módulos y Tableros Analíticos',
      badge: 'Paso 3 de 7 · Estructura del Dashboard',
      icon: BarChart3,
      description: 'Navegue entre 4 grandes módulos diseñados para simplificar la auditoría ciudadana y el análisis de la contratación.',
      keyPoints: [
        'Resumen de Entidad: Visión general, top contratistas y modalidades.',
        'Listado de Contratos: Tabla interactiva con filtros dinámicos.',
        'Supervisores: Evaluación de control ciudadano y reportes.',
        'Recursos y Métricas: Detección de patrones y alertas tempranas.'
      ],
      targetTab: 'resumen',
      actionText: 'Ir a Resumen de Entidad',
      interactivePreview: (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 font-sans text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-indigo-100/70 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700/60 rounded-xl text-indigo-900 dark:text-indigo-200 space-y-1 shadow-2xs">
              <div className="font-bold text-[11px] flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Resumen
              </div>
              <p className="text-[10px] text-indigo-700 dark:text-indigo-300/80 leading-tight">Métricas globales y presupuesto.</p>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-300 space-y-1 shadow-2xs">
              <div className="font-bold text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Contratos
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Detalle individual con links SECOP.</p>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-300 space-y-1 shadow-2xs">
              <div className="font-bold text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Supervisores
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Control presupuestal y reportes.</p>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-300 space-y-1 shadow-2xs">
              <div className="font-bold text-[11px] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Métricas
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Patrones, adiciones y cruces.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'filtros-contratos',
      title: 'Filtrado Avanzado de Contratos',
      badge: 'Paso 4 de 7 · Búsqueda Multicriterio',
      icon: Filter,
      description: 'En el listado de contratos puede combinar múltiples filtros en tiempo real para encontrar contrataciones de interés específico.',
      keyPoints: [
        'Búsqueda predictiva en tiempo real por palabra clave, objeto del contrato o proveedor.',
        'Filtrado por Modalidad: Directa, Mínima Cuantía, Licitación.',
        'Rango de Cuantía: Filtre por montos mínimos y máximos.',
        'Categorías de Gasto: Tecnología, Infraestructura, Salud, etc.'
      ],
      targetTab: 'contratos',
      actionText: 'Ver Listado de Contratos',
      interactivePreview: (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 font-sans text-xs">
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400">Buscar "software", "consorcio", "mantenimiento"...</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-mono font-bold">
              Modalidad: Contratación Directa
            </span>
            <span className="px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold">
              &gt; $100M COP
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'alertas-patrones',
      title: 'Lentes de Control Ciudadano y Patrones',
      badge: 'Paso 5 de 7 · Algoritmos de Detección',
      icon: ShieldAlert,
      description: 'El módulo de Métricas incluye algoritmos inteligentes para detectar posibles inconsistencias o concentraciones en la contratación.',
      keyPoints: [
        'Cruce de Plazos: Simultaneidad de contratos en el mismo período.',
        'Objetos Idénticos: Reutilización textual exacta de minutas.',
        'Similitud Léxica: Detección de patrones redactados con leve variación.',
        'Alertas y Plazos: Mapeo de adiciones, prorrogas y saldos por ejecutar.'
      ],
      targetTab: 'metricas',
      actionText: 'Explorar Métricas y Alertas',
      interactivePreview: (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 font-sans text-xs">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-between text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold text-[11px]">Cruce de Plazos</span>
            </div>
            <span className="font-mono text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 font-bold">
              21 alertas
            </span>
          </div>
          <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-xl flex items-center justify-between text-sky-900 dark:text-sky-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="font-bold text-[11px]">Similitud Léxica</span>
            </div>
            <span className="font-mono text-[10px] bg-sky-200 dark:bg-sky-900/60 text-sky-900 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-300 dark:border-sky-700 font-bold">
              53 coincidencias
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'atajos-teclado',
      title: 'Atajos de Teclado y Accesibilidad',
      badge: 'Paso 6 de 7 · Navegación Rápida',
      icon: Keyboard,
      description: 'Acceda instantáneamente a las funciones clave mediante atajos de teclado globales desde cualquier sección de la plataforma.',
      keyPoints: [
        'Ctrl + Flechas (← / →): Cambie rápidamente entre las pestañas del tablero analítico.',
        'Ctrl + H: Abra o cierre este tutorial y guía de uso en cualquier momento.',
        'Tecla Escape: Cierre modales y paneles desplegables de inmediato.'
      ],
      calloutQuestion: '¿Desea probar los atajos en el dashboard ahora mismo?',
      actionText: '¡Probar Atajos!',
      interactivePreview: (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 font-sans text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-mono text-[10px] uppercase text-indigo-600 dark:text-indigo-400 font-bold">Teclas de Acceso Rápido</span>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full font-bold">Global</span>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pestañas Dashboard</span>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-bold">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-bold">← / →</kbd>
              </div>
            </div>
            <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Abrir/Cerrar Tutorial</span>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-bold">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-bold">H</kbd>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cache-offline',
      title: 'Rendimiento y Modo Offline (IndexedDB)',
      badge: 'Paso 7 de 7 · Tecnología Local',
      icon: Database,
      description: 'Contrato-Claro almacena localmente los registros consultados en su navegador utilizando IndexedDB, permitiendo navegar al instante.',
      keyPoints: [
        'Velocidad extrema de respuesta en filtros e informes.',
        'Permite consultar datos guardados sin consumo recurrente de datos.',
        'Almacenamiento seguro en su navegador con privacidad total.'
      ],
      calloutQuestion: '¿Desea explorar la plataforma en el dashboard ahora mismo?',
      actionText: '¡Comenzar Exploración!',
      interactivePreview: (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="font-mono text-[10px] uppercase text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Cache Local Activa
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">IndexedDB</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Todos los datos consultados se almacenan con privacidad total en su dispositivo.
          </p>
        </div>
      )
    }
  ];

  const step = steps[currentStep];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
      if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps.length, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepAction = () => {
    if (step.id === 'territorial' && onFocusTerritorial) {
      onFocusTerritorial();
    } else if (step.id === 'periodo' && onFocusPeriod) {
      onFocusPeriod();
    } else if (step.targetTab && onNavigateTab) {
      onNavigateTab(step.targetTab);
    }
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      id="onboarding-modal-backdrop"
    >
      <div 
        className={`relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 animate-scale-up ${
          easyRead 
            ? 'bg-amber-50/95 dark:bg-slate-900 text-slate-950 dark:text-slate-50 border-4 border-slate-900 dark:border-white font-sans' 
            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
        }`}
        onClick={(e) => e.stopPropagation()}
        id="onboarding-modal-container"
      >
        {/* Top Progress Bar */}
        <div className="h-2 bg-slate-200 dark:bg-slate-800 w-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between gap-4 ${
          easyRead 
            ? 'border-slate-900 dark:border-slate-700 bg-amber-100/80 dark:bg-slate-900' 
            : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/90'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 border ${
              easyRead 
                ? 'bg-indigo-700 text-white border-slate-900 dark:border-white' 
                : 'bg-indigo-100 dark:bg-indigo-600/30 border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-400'
            }`}>
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                easyRead ? 'text-indigo-900 dark:text-indigo-300 text-xs font-extrabold' : 'text-indigo-600 dark:text-indigo-400'
              }`}>
                Guía Interactiva de Contrato-Claro
              </span>
              <span className={`text-xs font-semibold ${
                easyRead ? 'text-slate-900 dark:text-slate-200 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {step.badge}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              easyRead
                ? 'hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-white'
                : 'text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="Cerrar tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Main Title & Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300">
              <step.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h2 className={`font-extrabold tracking-tight ${
                easyRead ? 'text-xl sm:text-2xl text-slate-950 dark:text-white' : 'text-lg sm:text-xl text-slate-900 dark:text-white'
              }`}>
                {step.title}
              </h2>
            </div>
            <p className={`leading-relaxed ${
              easyRead ? 'text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100' : 'text-xs sm:text-sm text-slate-600 dark:text-slate-300'
            }`}>
              {step.description}
            </p>
          </div>

          {/* Interactive Preview Card & Key Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            
            {/* Visual Interactive Preview */}
            <div className="flex flex-col justify-between space-y-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                easyRead ? 'text-slate-900 dark:text-slate-300 text-xs' : 'text-slate-500 dark:text-slate-400'
              }`}>
                Demostración Visual
              </span>
              {step.interactivePreview}
            </div>

            {/* Key Bullet Points */}
            <div className={`p-4 rounded-2xl space-y-2.5 flex flex-col justify-center border ${
              easyRead
                ? 'bg-amber-100/90 dark:bg-slate-950 border-2 border-slate-900 dark:border-slate-700'
                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80'
            }`}>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 ${
                easyRead ? 'text-slate-950 dark:text-slate-200 text-xs' : 'text-slate-500 dark:text-slate-400'
              }`}>
                Aspectos Clave
              </span>
              {step.keyPoints.map((pt, i) => (
                <div key={i} className={`flex items-start gap-2 ${
                  easyRead ? 'text-xs sm:text-sm font-semibold text-slate-950 dark:text-slate-100' : 'text-xs text-slate-700 dark:text-slate-300'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{pt}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Context Action Callout */}
          {step.actionText && (
            <div className={`pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${
              easyRead
                ? 'bg-indigo-100 dark:bg-indigo-950 border-2 border-indigo-900 dark:border-indigo-400 text-indigo-950 dark:text-indigo-100'
                : 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200'
            }`}>
              <span className={`text-xs font-medium ${easyRead ? 'font-bold text-sm text-indigo-950 dark:text-indigo-100' : ''}`}>
                {step.calloutQuestion || '¿Desea explorar esta función en el dashboard ahora mismo?'}
              </span>
              <button
                onClick={handleStepAction}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer ${
                  easyRead
                    ? 'bg-indigo-900 hover:bg-indigo-800 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <span>{step.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
          easyRead
            ? 'bg-amber-100/90 dark:bg-slate-950 border-slate-900 dark:border-slate-700'
            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800/80'
        }`}>
          
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentStep 
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-500' 
                    : easyRead
                      ? 'w-2 bg-slate-400 dark:bg-slate-700 hover:bg-slate-600'
                      : 'w-2 bg-slate-300 dark:bg-slate-800 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
                title={`Ir al paso ${i + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  easyRead
                    ? 'border-2 border-slate-900 dark:border-white text-slate-950 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-950'
                    : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-900'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                easyRead
                  ? 'bg-indigo-900 hover:bg-indigo-800 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950 text-sm font-extrabold'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <span>{currentStep === steps.length - 1 ? 'Finalizar Tutorial' : 'Siguiente'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
