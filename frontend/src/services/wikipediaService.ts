export interface WikipediaSymbol {
  img: string;
  title: string;
  description?: string;
  extract?: string;
  pageUrl?: string;
  type: 'city' | 'department';
  locationName: string;
}

export interface TerritorySymbols {
  citySymbol: WikipediaSymbol | null;
  deptSymbol: WikipediaSymbol | null;
  loading: boolean;
  error: boolean;
}

// In-memory runtime cache for instant lookups
const memoryCache = new Map<string, WikipediaSymbol | null>();

/**
 * Normalizes location strings for dictionary matching.
 * E.g., "Bogotá, D.C." -> "bogota", "Alcaldía de Medellín" -> "medellin", "Gobernación del Valle" -> "valle del cauca"
 */
export function normalizeKey(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/^alcaldia\s+de\s+/i, "")
    .replace(/^gobernacion\s+de(l|\s+la)?\s+/i, "")
    .replace(/^municipio\s+de\s+/i, "")
    .replace(/^distrito\s+(especial|turistico|capital|biodiverso)\s+de\s+/i, "")
    .replace(/,\s*d\.?c\.?/i, "")
    .replace(/\s+d\.?c\.?/i, "")
    .replace(/\s*-\s*alcaldia/i, "")
    .replace(/\s*-\s*gobernacion/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cleans entity or location strings for Wikipedia queries
 */
export function cleanLocationName(name: string): string {
  if (!name) return "";
  const lower = name.trim().toLowerCase();
  if (
    lower === "no definido" ||
    lower === "no aplica" ||
    lower === "sin definir" ||
    lower === "colombia" ||
    lower === "desconocido"
  ) {
    return "";
  }

  let clean = name
    .replace(/^alcaldía\s+de\s+/i, "")
    .replace(/^gobernación\s+de(l|\s+la)?\s+/i, "")
    .replace(/^municipio\s+de\s+/i, "")
    .replace(/^distrito\s+(especial|turístico|capital|biodiverso)\s+de\s+/i, "")
    .replace(/,\s*D\.?C\.?/i, "")
    .replace(/\s+D\.?C\.?/i, "")
    .replace(/\s*-\s*alcaldía/i, "")
    .replace(/\s*-\s*gobernación/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const norm = normalizeKey(clean);
  if (norm === "bogota" || norm.includes("bogota")) return "Bogotá";
  if (norm === "valle" || norm === "valle del cauca") return "Valle del Cauca";
  if (norm.includes("san andres")) return "San Andrés y Providencia";
  if (norm.includes("norte de santander")) return "Norte de Santander";

  return clean;
}

// Complete preset catalog of official Wikimedia Commons SVG flag/coat of arms images
const COLOMBIA_PRESET_MAP: Record<string, WikipediaSymbol> = {
  // Departments
  "antioquia": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Flag_of_Antioquia_Department.svg/330px-Flag_of_Antioquia_Department.svg.png",
    title: "Bandera de Antioquia",
    description: "Símbolo oficial del Departamento de Antioquia",
    extract: "La bandera de Antioquia consta de dos franjas horizontales iguales: blanca en la parte superior, símbolo de la pureza y la paz, y verde en la parte inferior, símbolo de las montañas y la esperanza.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Antioquia",
    type: "department",
    locationName: "Antioquia"
  },
  "atlantico": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Flag_of_Atl%C3%A1ntico.svg/330px-Flag_of_Atl%C3%A1ntico.svg.png",
    title: "Bandera del Atlántico",
    description: "Símbolo oficial del Departamento del Atlántico",
    extract: "La bandera del Atlántico está conformada por tres franjas horizontales iguales: blanca, roja y blanca.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Atl%C3%A1ntico_(Colombia)",
    type: "department",
    locationName: "Atlántico"
  },
  "bogota": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Flag_of_Bogot%C3%A1.svg/330px-Flag_of_Bogot%C3%A1.svg.png",
    title: "Bandera de Bogotá",
    description: "Símbolo del Distrito Capital de Bogotá",
    extract: "La bandera de Bogotá fue adoptada en 1952. Consta de una franja horizontal amarilla superior que simboliza la justicia y virtud, y una franja inferior roja que representa la libertad y firmeza.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Bogot%C3%A1",
    type: "city",
    locationName: "Bogotá"
  },
  "bolivar": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Flag_of_Bol%C3%ADvar_%28Colombia%29.svg/330px-Flag_of_Bol%C3%ADvar_%28Colombia%29.svg.png",
    title: "Bandera de Bolívar",
    description: "Símbolo oficial del Departamento de Bolívar",
    extract: "La bandera de Bolívar está compuesta por tres franjas horizontales iguales: verde, amarilla y roja.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Bol%C3%ADvar_(Colombia)",
    type: "department",
    locationName: "Bolívar"
  },
  "boyaca": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Flag_of_Boyac%C3%A1_Department.svg/330px-Flag_of_Boyac%C3%A1_Department.svg.png",
    title: "Bandera de Boyacá",
    description: "Símbolo oficial del Departamento de Boyacá",
    extract: "La bandera de Boyacá consta de cinco franjas horizontales con los colores verde, blanco y rojo.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Boyac%C3%A1",
    type: "department",
    locationName: "Boyacá"
  },
  "caldas": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Flag_of_Caldas.svg/330px-Flag_of_Caldas.svg.png",
    title: "Bandera de Caldas",
    description: "Símbolo oficial del Departamento de Caldas",
    extract: "La bandera del departamento de Caldas está formada por dos franjas verticales: una amarilla y una verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Caldas",
    type: "department",
    locationName: "Caldas"
  },
  "caqueta": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Flag_of_Caquet%C3%A1.svg/330px-Flag_of_Caquet%C3%A1.svg.png",
    title: "Bandera del Caquetá",
    description: "Símbolo del Departamento del Caquetá",
    extract: "La bandera del departamento del Caquetá está conformada por tres franjas horizontales: verde, blanca y azul.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Caquet%C3%A1",
    type: "department",
    locationName: "Caquetá"
  },
  "casanare": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Banderadecasanare.svg/330px-Banderadecasanare.svg.png",
    title: "Bandera de Casanare",
    description: "Símbolo oficial del Departamento de Casanare",
    extract: "La bandera del departamento de Casanare está dividida en dos franjas diagonales roja y verde con un sol brillante central.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Casanare",
    type: "department",
    locationName: "Casanare"
  },
  "cauca": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Flag_of_Cauca.svg/330px-Flag_of_Cauca.svg.png",
    title: "Bandera del Cauca",
    description: "Símbolo oficial del Departamento del Cauca",
    extract: "La bandera del departamento del Cauca está compuesta por tres franjas horizontales de color verde, blanco y azul.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Cauca",
    type: "department",
    locationName: "Cauca"
  },
  "cesar": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Flag_of_Cesar.svg/330px-Flag_of_Cesar.svg.png",
    title: "Bandera del Cesar",
    description: "Símbolo oficial del Departamento del Cesar",
    extract: "La bandera del departamento del Cesar se compone de tres franjas horizontales: verde, blanca y verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Cesar",
    type: "department",
    locationName: "Cesar"
  },
  "choco": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Flag_of_Choc%C3%B3.svg/330px-Flag_of_Choc%C3%B3.svg.png",
    title: "Bandera del Chocó",
    description: "Símbolo del Departamento del Chocó",
    extract: "La bandera del Chocó consta de tres franjas horizontales: verde, amarilla y azul.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Choc%C3%B3",
    type: "department",
    locationName: "Chocó"
  },
  "cordoba": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Flag_of_C%C3%B3rdoba.svg/330px-Flag_of_C%C3%B3rdoba.svg.png",
    title: "Bandera de Córdoba",
    description: "Símbolo oficial del Departamento de Córdoba",
    extract: "La bandera de Córdoba consiste en tres franjas horizontales: azul, blanca y verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_C%C3%B3rdoba_(Colombia)",
    type: "department",
    locationName: "Córdoba"
  },
  "cundinamarca": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Flag_of_Cundinamarca.svg/330px-Flag_of_Cundinamarca.svg.png",
    title: "Bandera de Cundinamarca",
    description: "Símbolo del Departamento de Cundinamarca",
    extract: "La bandera de Cundinamarca está compuesta por tres franjas horizontales: azul, amarilla y roja.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Cundinamarca",
    type: "department",
    locationName: "Cundinamarca"
  },
  "guainia": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Flag_of_Guain%C3%ADa.svg/330px-Flag_of_Guain%C3%ADa.svg.png",
    title: "Bandera de Guainía",
    description: "Símbolo oficial del Departamento de Guainía",
    extract: "La bandera de Guainía se compone de tres franjas: amarilla, azul y verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Guain%C3%ADa",
    type: "department",
    locationName: "Guainía"
  },
  "guaviare": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Flag_of_Guaviare.svg/330px-Flag_of_Guaviare.svg.png",
    title: "Bandera de Guaviare",
    description: "Símbolo del Departamento de Guaviare",
    extract: "La bandera del Guaviare consta de tres franjas horizontales: verde, blanca y azul con tres estrellas.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Guaviare",
    type: "department",
    locationName: "Guaviare"
  },
  "huila": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Flag_of_Huila.svg/330px-Flag_of_Huila.svg.png",
    title: "Bandera del Huila",
    description: "Símbolo del Departamento del Huila",
    extract: "La bandera del Huila se compone de tres franjas horizontales de igual tamaño: blanca, verde y amarilla.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Huila",
    type: "department",
    locationName: "Huila"
  },
  "la guajira": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Flag_of_La_Guajira.svg/330px-Flag_of_La_Guajira.svg.png",
    title: "Bandera de La Guajira",
    description: "Símbolo del Departamento de La Guajira",
    extract: "La bandera de La Guajira consta de dos franjas horizontales de igual tamaño: verde y blanca.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_La_Guajira",
    type: "department",
    locationName: "La Guajira"
  },
  "magdalena": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Flag_of_Magdalena.svg/330px-Flag_of_Magdalena.svg.png",
    title: "Bandera del Magdalena",
    description: "Símbolo del Departamento del Magdalena",
    extract: "La bandera del Magdalena está conformada por seis franjas horizontales alternando los colores azul y rojo con 30 estrellas.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Magdalena",
    type: "department",
    locationName: "Magdalena"
  },
  "meta": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Flag_of_Meta.svg/330px-Flag_of_Meta.svg.png",
    title: "Bandera del Meta",
    description: "Símbolo oficial del Departamento del Meta",
    extract: "La bandera del Meta se compone de diecisiete franjas horizontales intercaladas en colores verde y blanco.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Meta",
    type: "department",
    locationName: "Meta"
  },
  "narino": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flag_of_Nari%C3%B1o.svg/330px-Flag_of_Nari%C3%B1o.svg.png",
    title: "Bandera de Nariño",
    description: "Símbolo del Departamento de Nariño",
    extract: "La bandera de Nariño consta de dos franjas horizontales iguales: la superior amarilla y la inferior verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Nari%C3%B1o",
    type: "department",
    locationName: "Nariño"
  },
  "norte de santander": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Flag_of_Norte_de_Santander.svg/330px-Flag_of_Norte_de_Santander.svg.png",
    title: "Bandera de Norte de Santander",
    description: "Símbolo del Departamento de Norte de Santander",
    extract: "La bandera de Norte de Santander consta de dos franjas horizontales iguales: roja arriba y negra abajo con cuatro estrellas.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Norte_de_Santander",
    type: "department",
    locationName: "Norte de Santander"
  },
  "putumayo": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Flag_of_Putumayo.svg/330px-Flag_of_Putumayo.svg.png",
    title: "Bandera del Putumayo",
    description: "Símbolo del Departamento del Putumayo",
    extract: "La bandera del Putumayo tiene tres franjas horizontales iguales: verde, blanca y negra.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Putumayo",
    type: "department",
    locationName: "Putumayo"
  },
  "quindio": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Flag_of_Quind%C3%ADo.svg/330px-Flag_of_Quind%C3%ADo.svg.png",
    title: "Bandera del Quindío",
    description: "Símbolo del Departamento del Quindío",
    extract: "La bandera del Quindío consta de tres franjas verticales: verde, amarilla y purpúrea.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Quind%C3%ADo",
    type: "department",
    locationName: "Quindío"
  },
  "risaralda": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Flag_of_Risaralda.svg/330px-Flag_of_Risaralda.svg.png",
    title: "Bandera de Risaralda",
    description: "Símbolo oficial del Departamento de Risaralda",
    extract: "La bandera de Risaralda consta de un fondo verde atravesado por catorce estrellas blancas en arco.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Risaralda",
    type: "department",
    locationName: "Risaralda"
  },
  "san andres y providencia": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Flag_of_San_Andr%C3%A9s_y_Providencia.svg/330px-Flag_of_San_Andr%C3%A9s_y_Providencia.svg.png",
    title: "Bandera de San Andrés y Providencia",
    description: "Símbolo del Archipiélago de San Andrés, Providencia y Santa Catalina",
    extract: "La bandera del departamento insular se compone de un campo azul con una cruz de San Andrés blanca.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_San_Andr%C3%A9s_y_Providencia",
    type: "department",
    locationName: "San Andrés y Providencia"
  },
  "santander": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Flag_of_Santander_Department.svg/330px-Flag_of_Santander_Department.svg.png",
    title: "Bandera de Santander",
    description: "Símbolo oficial del Departamento de Santander",
    extract: "La bandera de Santander presenta tres franjas horizontales (verde, amarilla, negra) con un triángulo rojo a la izquierda y estrellas representativas.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Santander_(Colombia)",
    type: "department",
    locationName: "Santander"
  },
  "sucre": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Flag_of_Sucre.svg/330px-Flag_of_Sucre.svg.png",
    title: "Bandera de Sucre",
    description: "Símbolo del Departamento de Sucre",
    extract: "La bandera de Sucre está conformada por dos franjas horizontales iguales: verde arriba y blanca abajo.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Sucre_(Colombia)",
    type: "department",
    locationName: "Sucre"
  },
  "tolima": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Flag_of_Tolima.svg/330px-Flag_of_Tolima.svg.png",
    title: "Bandera del Tolima",
    description: "Símbolo del Departamento del Tolima",
    extract: "La bandera del Tolima consta de dos franjas horizontales de igual tamaño: vino tinto y amarillo.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Tolima",
    type: "department",
    locationName: "Tolima"
  },
  "valle del cauca": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Flag_of_Valle_del_Cauca.svg/330px-Flag_of_Valle_del_Cauca.svg.png",
    title: "Bandera del Valle del Cauca",
    description: "Símbolo oficial del Departamento del Valle del Cauca",
    extract: "La bandera del Valle del Cauca fue adoptada en 1811 por las Ciudades Confederadas. Está compuesta por dos franjas horizontales celeste y blanca con borde de plata.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Valle_del_Cauca",
    type: "department",
    locationName: "Valle del Cauca"
  },
  "vaupes": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flag_of_Vaup%C3%A9s.svg/330px-Flag_of_Vaup%C3%A9s.svg.png",
    title: "Bandera del Vaupés",
    description: "Símbolo del Departamento del Vaupés",
    extract: "La bandera del Vaupés consta de dos franjas horizontales blanca y verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Vaup%C3%A9s",
    type: "department",
    locationName: "Vaupés"
  },
  "vichada": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flag_of_Vichada.svg/330px-Flag_of_Vichada.svg.png",
    title: "Bandera del Vichada",
    description: "Símbolo del Departamento del Vichada",
    extract: "La bandera del Vichada consta de dos franjas horizontales iguales: amarilla y verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Vichada",
    type: "department",
    locationName: "Vichada"
  },
  "amazonas": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Flag_of_Amazonas_%28Colombia%29.svg/330px-Flag_of_Amazonas_%28Colombia%29.svg.png",
    title: "Bandera del Amazonas",
    description: "Símbolo del Departamento del Amazonas",
    extract: "La bandera del departamento del Amazonas presenta franjas verde, blanca y un sol amarillo con jaguar.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_del_Amazonas_(Colombia)",
    type: "department",
    locationName: "Amazonas"
  },
  "arauca": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Flag_of_Arauca.svg/330px-Flag_of_Arauca.svg.png",
    title: "Bandera de Arauca",
    description: "Símbolo del Departamento de Arauca",
    extract: "La bandera de Arauca está dividida en dos franjas horizontales: roja y verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Arauca",
    type: "department",
    locationName: "Arauca"
  },

  // Cities
  "medellin": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Escudo_de_Medellin.svg/330px-Escudo_de_Medellin.svg.png",
    title: "Escudo y Emblema de Medellín",
    description: "Emblema oficial de Medellín, Antioquia",
    extract: "El escudo de armas de Medellín es el emblema heráldico oficial de la ciudad de Medellín, capital de Antioquia, otorgado por el rey Carlos II de España en 1678.",
    pageUrl: "https://es.wikipedia.org/wiki/Escudo_de_Medell%C3%ADn",
    type: "city",
    locationName: "Medellín"
  },
  "cali": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Flag_of_Santiago_de_Cali.svg/330px-Flag_of_Santiago_de_Cali.svg.png",
    title: "Bandera de Santiago de Cali",
    description: "Símbolo oficial de Cali, Valle del Cauca",
    extract: "La bandera de Santiago de Cali está conformada por franjas horizontales azul, blanca, roja y verde.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Cali",
    type: "city",
    locationName: "Cali"
  },
  "barranquilla": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Flag_of_Barranquilla.svg/330px-Flag_of_Barranquilla.svg.png",
    title: "Bandera de Barranquilla",
    description: "Bandera cuadrilonga de Barranquilla, Atlántico",
    extract: "La bandera cuadrilonga es el símbolo patrio de Barranquilla. Compuesta por tres rectángulos concéntricos rojo, amarillo y verde con una estrella de ocho puntas.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Barranquilla",
    type: "city",
    locationName: "Barranquilla"
  },
  "cartagena": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Flag_of_Cartagena_de_Indias.svg/330px-Flag_of_Cartagena_de_Indias.svg.png",
    title: "Bandera Cuadrilonga de Cartagena",
    description: "Símbolo heroico de Cartagena de Indias",
    extract: "La bandera cuadrilonga fue la primera bandera de Colombia independiente adoptada en Cartagena en 1811.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_cuadrilonga",
    type: "city",
    locationName: "Cartagena"
  },
  "bucaramanga": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Flag_of_Bucaramanga.svg/330px-Flag_of_Bucaramanga.svg.png",
    title: "Bandera de Bucaramanga",
    description: "Símbolo oficial de Bucaramanga, Santander",
    extract: "La bandera de Bucaramanga consta de tres franjas horizontales: verde, amarilla y verde, con una estrella blanca central.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Bucaramanga",
    type: "city",
    locationName: "Bucaramanga"
  },
  "cucuta": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Flag_of_C%C3%BAcuta.svg/330px-Flag_of_C%C3%BAcuta.svg.png",
    title: "Bandera de Cúcuta",
    description: "Símbolo oficial de San José de Cúcuta",
    extract: "La bandera de Cúcuta consta de dos franjas horizontales iguales de color negro y rojo con estrellas amarillas.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_C%C3%BAcuta",
    type: "city",
    locationName: "Cúcuta"
  },
  "pereira": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Flag_of_Pereira.svg/330px-Flag_of_Pereira.svg.png",
    title: "Bandera de Pereira",
    description: "Símbolo de Pereira, Risaralda",
    extract: "La bandera de Pereira consta de un triángulo amarillo sobre campo de color franja roja.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Pereira",
    type: "city",
    locationName: "Pereira"
  },
  "manizales": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Flag_of_Manizales.svg/330px-Flag_of_Manizales.svg.png",
    title: "Bandera de Manizales",
    description: "Símbolo oficial de Manizales, Caldas",
    extract: "La bandera de Manizales está conformada por tres franjas horizontales: blanca, verde y roja.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Manizales",
    type: "city",
    locationName: "Manizales"
  },
  "pasto": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Flag_of_Pasto.svg/330px-Flag_of_Pasto.svg.png",
    title: "Bandera de San Juan de Pasto",
    description: "Símbolo de Pasto, Nariño",
    extract: "La bandera de San Juan de Pasto consta de un diseño triangular de tres colores: amarillo, azul y rojo.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Pasto",
    type: "city",
    locationName: "Pasto"
  },
  "santa marta": {
    img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Flag_of_Santa_Marta.svg/330px-Flag_of_Santa_Marta.svg.png",
    title: "Bandera de Santa Marta",
    description: "Símbolo de Santa Marta, Magdalena",
    extract: "La bandera de Santa Marta se compone de dos franjas horizontales: blanca y azul.",
    pageUrl: "https://es.wikipedia.org/wiki/Bandera_de_Santa_Marta",
    type: "city",
    locationName: "Santa Marta"
  }
};

/**
 * Fetches Wikipedia official flag or coat-of-arms symbol for a city or department in Colombia.
 * Uses instantaneous preset lookup first, then memory/localStorage cache, and finally Wikipedia REST API.
 */
export async function fetchWikiSymbol(
  locationName: string,
  type: 'city' | 'department'
): Promise<WikipediaSymbol | null> {
  const cleanName = cleanLocationName(locationName);
  if (!cleanName) return null;

  const keyNorm = normalizeKey(cleanName);
  const cacheKey = `wiki_symbol_v3_${type}_${keyNorm}`;

  // 1. Instant Preset Catalog Lookup
  if (COLOMBIA_PRESET_MAP[keyNorm]) {
    const preset = { ...COLOMBIA_PRESET_MAP[keyNorm], type, locationName: cleanName };
    memoryCache.set(cacheKey, preset);
    return preset;
  }

  // 2. Memory Cache Lookup
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  // 3. LocalStorage Cache Lookup
  try {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      const parsed = JSON.parse(cachedItem);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 14 * 24 * 60 * 60 * 1000) {
        memoryCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (e) {
    // ignore
  }

  // 4. Candidate Wikipedia page summary REST requests
  const candidateTitles: string[] = [];
  if (type === 'city') {
    candidateTitles.push(
      `Bandera_de_${cleanName}`,
      `Escudo_de_${cleanName}`,
      `Bandera_de_${cleanName}_(Colombia)`,
      `Escudo_de_${cleanName}_(Colombia)`,
      `Símbolos_de_${cleanName}`,
      `${cleanName}_(Colombia)`
    );
  } else {
    candidateTitles.push(
      `Bandera_de_${cleanName}`,
      `Bandera_de_${cleanName}_(Colombia)`,
      `Bandera_del_${cleanName}`,
      `Bandera_del_departamento_de_${cleanName}`,
      `Escudo_de_${cleanName}`,
      `Escudo_del_${cleanName}`
    );
  }

  for (const rawCandidate of candidateTitles) {
    const formattedTitle = rawCandidate.replace(/ /g, "_");
    const summaryUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedTitle)}`;

    try {
      // Standard fetch without custom headers to avoid CORS preflight failures in browser
      const res = await fetch(summaryUrl);
      if (res.ok) {
        const pageData = await res.json();
        const img = pageData.thumbnail?.source || pageData.originalimage?.source;

        if (img && pageData.type !== "disambiguation" && !pageData.title?.includes("Error")) {
          const symbol: WikipediaSymbol = {
            img,
            title: pageData.title || `Insignia de ${cleanName}`,
            description: pageData.description || `Símbolo territorial de ${cleanName}`,
            extract: pageData.extract,
            pageUrl: pageData.content_urls?.desktop?.page || `https://es.wikipedia.org/wiki/${encodeURIComponent(formattedTitle)}`,
            type,
            locationName: cleanName
          };

          memoryCache.set(cacheKey, symbol);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: symbol }));
          } catch (e) { /* ignore */ }

          return symbol;
        }
      }
    } catch (e) {
      // Continue next candidate
    }
  }

  // Save null in cache to avoid repeated requests
  memoryCache.set(cacheKey, null);
  return null;
}
