import { Contrato } from '../types';

export interface CategoriaMeta {
  id: string;
  label: string;
  descripcion: string;
  iconName: string; // Will map to Lucide icons
  colorClass: string; // Tailwind text color
  bgClass: string; // Tailwind background light/dark
  borderClass: string; // Tailwind border light/dark
  hoverClass: string;
  keywords: string[];
}

export const CATEGORIAS_SPENDING: CategoriaMeta[] = [
  {
    id: 'salud',
    label: 'Salud',
    descripcion: 'Insumos médicos, vacunación, dotación de hospitales, salud pública e IPS',
    iconName: 'Activity',
    colorClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    borderClass: 'border-rose-150 dark:border-rose-900/40',
    hoverClass: 'hover:bg-rose-100 dark:hover:bg-rose-900/50',
    keywords: [
      'salud', 'medico', 'medica', 'hospital', 'clinica', 'odontolog', 'vacuna', 'farmacia', 
      'medicamento', 'ambulancia', 'quirurg', 'asistencia medica', 'epidem', 'enfermer', 
      'psicolog', 'oxigeno', 'odontologia', 'bioseguridad', 'insumos medicos', 'saludable', 
      'pediatria', 'ginecologia', 'paciente', 'clinico', 'ips', 'eps', 'medicinas', 
      'sifilis', 'vih', 'tuberculosis', 'dengue', 'hospitalario', 'medicamentos', 'urgencias'
    ]
  },
  {
    id: 'infraestructura',
    label: 'Infraestructura',
    descripcion: 'Obras civiles, pavimentación, mantenimiento vial, parques y edificaciones',
    iconName: 'Building',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-150 dark:border-amber-900/40',
    hoverClass: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
    keywords: [
      'infraestructura', 'obra', 'vias', 'pavimento', 'construccion', 'asfalto', 'parque', 
      'puente', 'reparacion', 'acueducto', 'alcantarillado', 'malla vial', 'alcantarilla', 
      'edificacion', 'vivienda', 'paviment', 'adecuacion', 'remodelacion', 'construir', 
      'obras civiles', 'cemento', 'ladrillo', 'arena', 'arquitectura', 'ingenieria', 
      'alcantarillados', 'pozo', 'pavimentacion', 'reparcheo', 'via', 'intervencion vial', 
      'aceras', 'andenes', 'alcantarillas', 'canalizacion', 'asfaltica', 'viviendas', 
      'mejoramiento', 'fachada', 'infraestructuras', 'locativo', 'alcantarillado', 'pluvial'
    ]
  },
  {
    id: 'educacion',
    label: 'Educación',
    descripcion: 'Alimentación escolar (PAE), útiles escolares, capacitación docente e instituciones educativas',
    iconName: 'GraduationCap',
    colorClass: 'text-sky-600 dark:text-sky-400',
    bgClass: 'bg-sky-50 dark:bg-sky-950/30',
    borderClass: 'border-sky-150 dark:border-sky-900/40',
    hoverClass: 'hover:bg-sky-100 dark:hover:bg-sky-900/50',
    keywords: [
      'educacion', 'colegio', 'escuela', 'docente', 'aprendizaje', 'pedagog', 'estudiante', 
      'util escolar', 'escolares', 'alimentacion escolar', 'pae', 'aula', 'enseñanza', 
      'academico', 'beca', 'universid', 'universitario', 'colegios', 'pedagogico', 'docentes', 
      'capacitacion', 'talleres pedagogicos', 'bilinguismo', 'matrícula', 'educativo', 
      'escolar', 'institucion educativa', 'refrigerio escolar', 'transporte escolar', 
      'pedagogica', 'alfabetizacion', 'aulas', 'colegios'
    ]
  },
  {
    id: 'consultoria',
    label: 'Consultoría',
    descripcion: 'Asesoría jurídica o técnica, apoyo a la gestión, interventorías y auditorías',
    iconName: 'FileText',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderClass: 'border-indigo-150 dark:border-indigo-900/40',
    hoverClass: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
    keywords: [
      'consultoria', 'asesoria', 'estudio', 'diseño', 'apoyo a la gestion', 'prestacion de servicios', 
      'interventoria', 'auditoria', 'juridica', 'tecnica', 'asistencia tecnica', 'administrativo', 
      'profesionales', 'consultor', 'asesor', 'interventor', 'diseños', 'planes de desarrollo', 
      'estudios previos', 'consultores', 'juridico', 'financiero', 'contable', 'gestion documental', 
      'archivo', 'formulacion', 'asistencias', 'planeacion', 'politica publica', 'psicosocial',
      'prestacion de servicio'
    ]
  },
  {
    id: 'tecnologia',
    label: 'Tecnología',
    descripcion: 'Conectividad a internet, licencias de software, computadores y sistemas de información',
    iconName: 'Laptop',
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderClass: 'border-cyan-150 dark:border-cyan-900/40',
    hoverClass: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/50',
    keywords: [
      'tecnologia', 'software', 'computador', 'internet', 'sistema', 'licencia', 'conectividad', 
      'digital', 'informatica', 'redes', 'servidor', 'soporte tecnico', 'hardware', 'impresor', 
      'telecomunicac', 'computadores', 'impresoras', 'licenciamiento', 'red', 'fibra optica', 
      'wi-fi', 'wifi', 'tecnologico', 'portatil', 'portatiles', 'tabletas', 'pantalla', 
      'servidores', 'hosting', 'dominio', 'nube', 'cloud', 'tecnologias', 'telecomunicaciones', 
      'antivirus', 'bases de datos', 'informatica', 'sistemas'
    ]
  },
  {
    id: 'papeleria',
    label: 'Papelería y Oficina',
    descripcion: 'Suministros de oficina, útiles de papelería, mobiliario y archivadores',
    iconName: 'Paperclip',
    colorClass: 'text-teal-600 dark:text-teal-400',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    borderClass: 'border-teal-150 dark:border-teal-900/40',
    hoverClass: 'hover:bg-teal-100 dark:hover:bg-teal-900/50',
    keywords: [
      'papeleria', 'utiles de oficina', 'papel', 'toner', 'tinta', 'oficina', 'escritorio', 
      'suministros de oficina', 'muebles de oficina', 'carpetas', 'esfero', 'lapicero', 
      'resma', 'resmas', 'carton', 'cuaderno', 'carpetas', 'grapas', 'engrapadora', 
      'insumos de oficina', 'suministros para oficina', 'muebles', 'sillas de oficina', 
      'esferos', 'foliador', 'goma'
    ]
  },
  {
    id: 'eventos',
    label: 'Eventos y Logística',
    descripcion: 'Actividades culturales, recreación, deportes, catering, sonido y festividades',
    iconName: 'Compass',
    colorClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    borderClass: 'border-violet-150 dark:border-violet-900/40',
    hoverClass: 'hover:bg-violet-100 dark:hover:bg-violet-900/50',
    keywords: [
      'evento', 'logistica', 'espectaculo', 'concierto', 'fiesta', 'cultural', 'recreacion', 
      'deporte', 'deportiv', 'alimentacion', 'refrigerios', 'catering', 'feria', 'festividad', 
      'tarima', 'sonido', 'luces', 'festival', 'carnaval', 'navideño', 'navidad', 'decoracion', 
      'artesanal', 'deportes', 'culturales', 'recreativo', 'artístico', 'teatro', 'danza', 
      'musica', 'folclor', 'almuerzos', 'refrigerio', 'comida', 'orquesta', 'tarimas', 
      'divulgacion', 'folclorica', 'espectaculos'
    ]
  },
  {
    id: 'combustible',
    label: 'Combustible y Transporte',
    descripcion: 'Suministro de gasolina, ACPM, transporte de personal y mantenimiento vehicular',
    iconName: 'Fuel',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-150 dark:border-emerald-900/40',
    hoverClass: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    keywords: [
      'combustible', 'gasolina', 'acpm', 'diesel', 'transporte', 'vehiculo', 'carro', 
      'camioneta', 'moto', 'flete', 'pasajes', 'viaje', 'lubricante', 'combustibles', 
      'gasolinera', 'aceite motor', 'lubricantes', 'vehiculos', 'motocicletas', 
      'mantenimiento vehicular', 'taller', 'repuestos', 'llantas', 'serviteca', 
      'transporte terrestre', 'alquiler de vehiculos', 'arrendamiento de vehiculo', 
      'taxis', 'fletes', 'gas'
    ]
  },
  {
    id: 'vigilancia',
    label: 'Vigilancia y Seguridad',
    descripcion: 'Vigilancia privada, celaduría, seguros de vida y pólizas de cobertura',
    iconName: 'Shield',
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderClass: 'border-indigo-150 dark:border-indigo-900/40',
    hoverClass: 'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50',
    keywords: [
      'vigilancia', 'seguridad', 'celador', 'escolta', 'monitoreo', 'camara de seguridad', 
      'alarma', 'seguro', 'vigilante', 'vigilantes', 'escoltas', 'camaras de seguridad', 
      'blindado', 'seguridad privada', 'porteria', 'rondas', 'supervision', 'seguro de vida', 
      'poliza', 'polizas', 'seguros', 'cerrajeria', 'extintor'
    ]
  },
  {
    id: 'aseo',
    label: 'Aseo y Cafetería',
    descripcion: 'Servicios de aseo, limpieza institucional, desinfección y cafetería',
    iconName: 'Sparkles',
    colorClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    borderClass: 'border-fuchsia-150 dark:border-fuchsia-900/40',
    hoverClass: 'hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50',
    keywords: [
      'aseo', 'limpieza', 'desinfeccion', 'cafeteria', 'jardineria', 'residuos', 'basura', 
      'suministro de aseo', 'insecticida', 'fumigacion', 'desinfectante', 'jabones', 
      'escoba', 'trapeador', 'reciclaje', 'vertederos', 'recoleccion de basura', 
      'jardinero', 'insumos de aseo', 'lavado', 'lavanderia', 'desechos', 'jardines'
    ]
  },
  {
    id: 'otros',
    label: 'Otros Gastos',
    descripcion: 'Arrendamientos, servicios públicos, dotación variada u otros rubros misceláneos',
    iconName: 'Layout',
    colorClass: 'text-slate-600 dark:text-slate-400',
    bgClass: 'bg-slate-50 dark:bg-slate-950/30',
    borderClass: 'border-slate-150 dark:border-slate-900/40',
    hoverClass: 'hover:bg-slate-100 dark:hover:bg-slate-900/50',
    keywords: [] // Fallback category
  }
];

/**
 * Normalizes text: lowercase and accent-insensitive
 */
function normalizarTexto(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Classifies a single contract based on its object text
 */
export function clasificarContrato(contrato: Contrato): string {
  const objetoNorm = normalizarTexto(contrato.objeto_del_contrato);
  const descripcionNorm = normalizarTexto(contrato.descripcion_del_proceso);
  const contratistaNorm = normalizarTexto(contrato.proveedor_adjudicado);
  const fullTexto = `${objetoNorm} ${descripcionNorm} ${contratistaNorm}`;

  let maxScore = 0;
  let categoriaGanadora = 'otros';

  // We loop through each category (except 'otros') and check how many unique keywords hit
  for (const cat of CATEGORIAS_SPENDING) {
    if (cat.id === 'otros') continue;

    let score = 0;
    for (const kw of cat.keywords) {
      if (fullTexto.includes(kw)) {
        // Boost factor if the keyword matches closer to a word boundary, or simply increment
        score += 1;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      categoriaGanadora = cat.id;
    }
  }

  return categoriaGanadora;
}

export interface CategoriaSpendingSummary {
  categoria: CategoriaMeta;
  totalValor: number;
  contratosCount: number;
  porcentajeValor: number;
  contratos: Contrato[];
}

/**
 * Groups a list of contracts by category and calculates spending metrics
 */
export function obtenerResumenDeGastos(contratos: Contrato[]): CategoriaSpendingSummary[] {
  // Initialize map
  const resMap = new Map<string, { count: number; valor: number; list: Contrato[] }>();
  CATEGORIAS_SPENDING.forEach(cat => {
    resMap.set(cat.id, { count: 0, valor: 0, list: [] });
  });

  let granTotalValor = 0;

  // Process and group each contract
  contratos.forEach(c => {
    const catId = clasificarContrato(c);
    const val = Number(c.valor_del_contrato) || 0;
    granTotalValor += val;

    const data = resMap.get(catId) || { count: 0, valor: 0, list: [] };
    data.count += 1;
    data.valor += val;
    data.list.push(c);
    resMap.set(catId, data);
  });

  // Convert map to formatted summary array
  const summaries: CategoriaSpendingSummary[] = CATEGORIAS_SPENDING.map(cat => {
    const data = resMap.get(cat.id) || { count: 0, valor: 0, list: [] };
    const pct = granTotalValor > 0 ? (data.valor / granTotalValor) * 100 : 0;

    return {
      categoria: cat,
      totalValor: data.valor,
      contratosCount: data.count,
      porcentajeValor: pct,
      contratos: data.list
    };
  });

  // Sort summaries: Show categories with either contracts or value first, ordered by total spending desc
  return summaries.sort((a, b) => {
    // Keep 'otros' towards the end if it has less value, but generally sort by value
    if (a.categoria.id === 'otros' && b.categoria.id !== 'otros' && a.totalValor < b.totalValor) return 1;
    if (b.categoria.id === 'otros' && a.categoria.id !== 'otros' && b.totalValor < a.totalValor) return -1;
    return b.totalValor - a.totalValor;
  });
}
