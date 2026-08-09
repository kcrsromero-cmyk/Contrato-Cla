import { Contrato, EntidadResumen } from '../types';
import { CacheService } from './db';

const BASE_URL = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';

// TTLs in milliseconds
const TTL_DEPARTAMENTOS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TTL_CIUDADES = 7 * 24 * 60 * 60 * 1000; // 7 days
const TTL_ENTIDADES = 2 * 24 * 60 * 60 * 1000; // 2 days
const TTL_CONTRATOS = 30 * 60 * 1000; // 30 minutes

// Helper to escape single quotes in SoQL string literals
function escapeSoQL(val: string): string {
  return val.replace(/'/g, "''");
}

export class SecopApiService {
  /**
   * Wrapper for fetch with exponential backoff on 429 Too Many Requests
   */
  private static async fetchWithRetry(url: string, retries = 3, backoff = 300): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url);
      if (response.status === 429) {
        if (i < retries - 1) {
          console.warn(`Rate limit exceeded (429). Retrying in ${backoff}ms...`);
          await new Promise(res => setTimeout(res, backoff));
          backoff *= 2; // Exponential backoff
          continue;
        }
      }
      return response;
    }
    return fetch(url); // final attempt
  }

  /**
   * Fetch all unique departments
   */
  public static async getDepartamentos(): Promise<string[]> {
    const cacheKey = 'catalogo:departamentos';
    const cached = await CacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    // SoQL: select distinct departamento ordered by departamento
    const query = `?$select=distinct departamento&$order=departamento&$where=departamento is not null&$limit=100`;
    try {
      const response = await SecopApiService.fetchWithRetry(`${BASE_URL}${query}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json() as { departamento: string }[];
      const list = data
        .map(item => item.departamento)
        .filter(dept => dept && dept.trim() !== '' && dept !== 'No Definido')
        .map(dept => dept.trim());
      
      // Deduplicate and sort
      const uniqueList = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
      await CacheService.set(cacheKey, uniqueList, TTL_DEPARTAMENTOS);
      return uniqueList;
    } catch (e) {
      console.error('Failed to fetch departamentos:', e);
      const staleData = await CacheService.get<string[]>(cacheKey, true);
      if (staleData) return staleData;
      // Fallback standard list of Colombian departments if API fails
      return [
        'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá',
        'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
        'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
        'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
        'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
      ];
    }
  }

  /**
   * Fetch all unique cities in a department
   */
  public static async getCiudades(departamento: string): Promise<string[]> {
    const escapedDept = escapeSoQL(departamento);
    const cacheKey = `ciudades_v2:${escapedDept}`;
    const cached = await CacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    // SoQL: select distinct ciudad for department, ordered by ciudad
    const query = `?$select=distinct ciudad&$where=departamento='${escapedDept}'&$order=ciudad&$limit=1000`;
    try {
      const response = await SecopApiService.fetchWithRetry(`${BASE_URL}${query}`);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json() as { ciudad: string }[];
      const list = data
        .map(item => item.ciudad)
        .filter(c => c && c.trim() !== '')
        .map(c => c.trim());
      
      const uniqueList = Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
      
      // Look for 'No Definido' (case-insensitive) and place it at the very beginning
      const indexNoDef = uniqueList.findIndex(c => c.toLowerCase() === 'no definido');
      if (indexNoDef !== -1) {
        uniqueList.splice(indexNoDef, 1);
        uniqueList.unshift('No Definido');
      } else {
        // If not returned by the API but we want to make sure it's always there as an option, we can add it,
        // but the API usually returns it if there are records.
      }

      await CacheService.set(cacheKey, uniqueList, TTL_CIUDADES);
      return uniqueList;
    } catch (e) {
      console.error(`Failed to fetch ciudades for ${departamento}:`, e);
      const staleData = await CacheService.get<string[]>(cacheKey, true);
      if (staleData) return staleData;
      return [];
    }
  }

  /**
   * Fetch all unique entities in a department & city
   */
  public static async getEntidades(departamento: string, ciudad: string): Promise<EntidadResumen[]> {
    const escapedDept = escapeSoQL(departamento);
    const escapedCity = escapeSoQL(ciudad);
    // Use v12 to include nit_entidad in the cache records
    const cacheKey = `entidades_v12:${escapedDept}:${escapedCity}`;
    const cached = await CacheService.get<EntidadResumen[]>(cacheKey);
    if (cached) return cached;

    // Helper functions for string cleaning and matching
    const cleanString = (str: string): string => {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, " ")     // replace non-alphanumeric with spaces
        .replace(/\s+/g, " ")           // collapse spaces
        .trim();
    };

    const STOP_WORDS = new Set([
      'de', 'del', 'la', 'los', 'el', 'y', 'en', 'con', 'no', 'definido', 
      'departamento', 'gobernacion', 'san', 'santa', 'municipio', 'alcaldia',
      'ese', 'e s e', 'nacional', 'colombia', 'regional'
    ]);

    const getDistinctiveWords = (cityName: string): string[] => {
      const clean = cleanString(cityName);
      return clean
        .split(' ')
        .filter(word => word.length > 2 && !STOP_WORDS.has(word));
    };

    const isDirectMatch = (entity: any, targetCity: string): boolean => {
      const targetClean = cleanString(targetCity);
      if (!targetClean) return false;
      
      const entCityClean = cleanString(entity.ciudad);
      const entLocClean = cleanString(entity.localizaci_n);
      const entNameClean = cleanString(entity.nombre_entidad);
      
      if (entCityClean === targetClean) return true;
      if (entLocClean.includes(targetClean)) return true;
      
      const targetWords = getDistinctiveWords(targetCity);
      if (targetWords.length > 0 && targetWords.every(word => entNameClean.includes(word))) {
        return true;
      }
      
      return false;
    };

    const matchesAnyMunicipality = (entity: any, municipalities: string[]): boolean => {
      for (const muni of municipalities) {
        if (isDirectMatch(entity, muni)) {
          return true;
        }
      }
      return false;
    };

    try {
      // 1. Fetch all unique entities in the department with rich metadata
      const fields = [
        'codigo_entidad',
        'nombre_entidad',
        'nit_entidad',
        'ciudad',
        'localizaci_n',
        'orden',
        'sector',
        'rama',
        'entidad_centralizada'
      ].join(',');
      
      const query = `?$select=${fields}&$where=departamento='${escapedDept}' and codigo_entidad is not null&$group=${fields}&$limit=5000`;
      
      let rawData: any[] = [];
      try {
        const response = await SecopApiService.fetchWithRetry(`${BASE_URL}${query}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        rawData = await response.json();
      } catch (err) {
        console.warn("Rich query failed, falling back to simple query:", err);
        // Fallback: simple query
        const simpleQuery = `?$select=codigo_entidad, nombre_entidad, nit_entidad&$where=departamento='${escapedDept}' and (ciudad='${escapedCity}' or ciudad='No Definido' or ciudad is null) and codigo_entidad is not null&$group=codigo_entidad, nombre_entidad, nit_entidad&$order=nombre_entidad&$limit=3000`;
        const response = await SecopApiService.fetchWithRetry(`${BASE_URL}${simpleQuery}`);
        if (!response.ok) throw new Error(`Fallback HTTP error ${response.status}`);
        rawData = await response.json();
      }

      // 2. Deduplicate entities by codigo_entidad, preserving the most informative record
      const entitiesMap = new Map<string, EntidadResumen>();
      for (const item of rawData) {
        const code = item.codigo_entidad?.trim();
        if (!code) continue;

        const name = item.nombre_entidad?.trim() || '';
        const itemCity = item.ciudad?.trim() || 'No Definido';
        const itemLoc = item.localizaci_n?.trim() || '';
        const itemOrden = item.orden?.trim() || '';
        const itemSector = item.sector?.trim() || '';
        const itemRama = item.rama?.trim() || '';
        const itemCentral = item.entidad_centralizada?.trim() || '';
        const itemNit = item.nit_entidad?.trim() || '';

        const record: EntidadResumen = {
          departamento,
          ciudad: itemCity,
          codigo_entidad: code,
          nombre_entidad: name,
          nit_entidad: itemNit,
          localizaci_n: itemLoc,
          orden: itemOrden,
          sector: itemSector,
          rama: itemRama,
          entidad_centralizada: itemCentral,
        };

        const existing = entitiesMap.get(code);
        if (!existing) {
          entitiesMap.set(code, record);
        } else {
          const exCity = cleanString(existing.ciudad);
          const curCity = cleanString(record.ciudad);
          const isExNoDef = !exCity || exCity === 'no definido';
          const isCurNoDef = !curCity || curCity === 'no definido';
          if (isExNoDef && !isCurNoDef) {
            entitiesMap.set(code, record);
          }
        }
      }

      const deduplicatedList = Array.from(entitiesMap.values());

      // 3. Identify capital city dynamically (the city with the highest direct entity count)
      const cityCounts = new Map<string, number>();
      for (const entity of deduplicatedList) {
        const cityVal = (entity.ciudad || '').trim();
        if (cityVal && cityVal.toLowerCase() !== 'no definido') {
          const normalized = cleanString(cityVal);
          cityCounts.set(normalized, (cityCounts.get(normalized) || 0) + 1);
        }
      }

      let capitalCityNormalized = '';
      let maxCount = 0;
      for (const [normCity, count] of cityCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          capitalCityNormalized = normCity;
        }
      }

      // 4. Get list of all actual municipalities
      const allCities = await SecopApiService.getCiudades(departamento);
      const actualMunicipalities = allCities.filter(c => cleanString(c) !== 'no definido');
      const cleanSelectedCity = cleanString(ciudad);
      const isSelectedNoDef = cleanSelectedCity === 'no definido';

      // 5. Filter entities
      const filteredList = deduplicatedList.filter(entity => {
        const entCityClean = cleanString(entity.ciudad);

        if (!isSelectedNoDef) {
          // A: Target is a specific city
          if (isDirectMatch(entity, ciudad)) {
            return true;
          }

          // If capital is selected, we also allow departmental/regional/national entities
          // that are registered as 'No Definido' and don't belong to any other specific municipality.
          const isCapitalSelected = cleanSelectedCity === capitalCityNormalized;
          if (isCapitalSelected) {
            const isEntNoDef = !entCityClean || entCityClean === 'no definido';
            if (isEntNoDef) {
              const otherMunicipalities = actualMunicipalities.filter(c => cleanString(c) !== cleanSelectedCity);
              if (!matchesAnyMunicipality(entity, otherMunicipalities)) {
                return true;
              }
            }
          }
          return false;
        } else {
          // B: Target is 'No Definido'
          const isEntNoDef = !entCityClean || entCityClean === 'no definido';
          if (isEntNoDef && !matchesAnyMunicipality(entity, actualMunicipalities)) {
            return true;
          }
          return false;
        }
      });

      // Sort alphabetically by name
      filteredList.sort((a, b) => a.nombre_entidad.localeCompare(b.nombre_entidad));

      await CacheService.set(cacheKey, filteredList, TTL_ENTIDADES);
      return filteredList;
    } catch (e) {
      console.error(`Failed to fetch entidades for ${departamento} - ${ciudad}:`, e);
      const staleData = await CacheService.get<EntidadResumen[]>(cacheKey, true);
      if (staleData) return staleData;
      return [];
    }
  }

  /**
   * Fetch all distinct years registered in SECOP II for a given entity's signed contracts
   */
  public static async getAniosContratacion(codigoEntidad: string): Promise<string[]> {
    const escapedCode = escapeSoQL(codigoEntidad);
    const cacheKey = `anios_contratacion_v2:${escapedCode}`;
    const cached = await CacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const query = `?$select=date_extract_y(fecha_de_firma) as anio&$where=codigo_entidad='${escapedCode}' and fecha_de_firma is not null&$group=anio&$order=anio DESC`;
    const url = `${BASE_URL}${encodeURI(query)}`;

    try {
      const response = await SecopApiService.fetchWithRetry(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json() as { anio?: string }[];
      const anios = data
        .map(item => item.anio?.trim())
        .filter(Boolean) as string[];

      // Sort numerically descending
      anios.sort((a, b) => b.localeCompare(a));

      if (anios.length > 0) {
        await CacheService.set(cacheKey, anios, 24 * 60 * 60); // Cache for 24 hours
        return anios;
      }
      
      // Fallback
      const current = new Date().getFullYear();
      return [String(current), String(current - 1)];
    } catch (err) {
      console.error(`Failed to fetch contraction years for ${codigoEntidad}:`, err);
      const staleData = await CacheService.get<string[]>(cacheKey, true);
      if (staleData) return staleData;
      const current = new Date().getFullYear();
      return [String(current), String(current - 1)];
    }
  }

  /**
   * Fetch all contract records for an entity in a given date range
   */
  public static async getContratos(
    codigoEntidad: string,
    fechaDesde: string,
    fechaHasta: string,
    forceRefresh: boolean = false
  ): Promise<Contrato[]> {
    const cacheKey = `contratos_raw:${codigoEntidad}:${fechaDesde}:${fechaHasta}`;
    
    if (!forceRefresh) {
      const cached = await CacheService.get<Contrato[]>(cacheKey);
      if (cached) return cached;
    }

    // Select only required fields to keep the payload lightweight (Principle of minimization of data)
    const selectFields = [
      'nombre_entidad',
      'codigo_entidad',
      'nit_entidad',
      'departamento',
      'ciudad',
      'id_contrato',
      'referencia_del_contrato',
      'proceso_de_compra',
      'urlproceso',
      'estado_contrato',
      'tipo_de_contrato',
      'modalidad_de_contratacion',
      'justificacion_modalidad_de',
      'objeto_del_contrato',
      'descripcion_del_proceso',
      'condiciones_de_entrega',
      'fecha_de_firma',
      'fecha_de_inicio_del_contrato',
      'fecha_de_fin_del_contrato',
      'ultima_actualizacion',
      'tipodocproveedor',
      'documento_proveedor',
      'proveedor_adjudicado',
      'codigo_proveedor',
      'valor_del_contrato',
      'valor_de_pago_adelantado',
      'valor_facturado',
      'valor_pagado',
      'valor_pendiente_de_pago',
      'valor_pendiente_de_ejecucion',
      'saldo_cdp',
      'nombre_supervisor',
      'nombre_ordenador_del_gasto',
      'duraci_n_del_contrato',
      'dias_adicionados',
      'el_contrato_puede_ser_prorrogado',
      'localizaci_n',
      'entidad_centralizada',
      'orden',
      'sector',
      'rama'
    ].join(',');

    const escapedCodigo = escapeSoQL(codigoEntidad);
    
    // SoQL Date Filters
    // Socrata floating_timestamp comparisons work with ISO formats
    const whereClause = [
      `codigo_entidad='${escapedCodigo}'`,
      `fecha_de_firma >= '${fechaDesde}T00:00:00.000'`,
      `fecha_de_firma <= '${fechaHasta}T23:59:59.999'`
    ].join(' and ');

    const orderClause = `fecha_de_firma DESC, id_contrato ASC`;
    const limit = 5000;

    try {
      let allData: Contrato[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const query = `?$select=${selectFields}&$where=${whereClause}&$order=${orderClause}&$limit=${limit}&$offset=${offset}`;
        const url = `${BASE_URL}${encodeURI(query)}`;

        const response = await SecopApiService.fetchWithRetry(url);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
        }

        const data = (await response.json()) as Contrato[];
        allData = allData.concat(data);

        if (data.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      // Clean/deduplicate and parse numbers
      const deduplicated: Contrato[] = [];
      const seenIds = new Set<string>();

      for (const item of allData) {
        if (!item.id_contrato) continue;
        const cleanId = item.id_contrato.trim();
        if (seenIds.has(cleanId)) continue;
        seenIds.add(cleanId);

        // Normalize numeric fields
        const parseNum = (val: any) => {
          if (val === undefined || val === null) return 0;
          const num = Number(val);
          return isNaN(num) ? 0 : num;
        };

        item.valor_del_contrato = parseNum(item.valor_del_contrato);
        item.valor_de_pago_adelantado = parseNum(item.valor_de_pago_adelantado);
        item.valor_facturado = parseNum(item.valor_facturado);
        item.valor_pagado = parseNum(item.valor_pagado);
        item.valor_pendiente_de_pago = parseNum(item.valor_pendiente_de_pago);
        item.valor_pendiente_de_ejecucion = parseNum(item.valor_pendiente_de_ejecucion);
        item.saldo_cdp = parseNum(item.saldo_cdp);
        item.dias_adicionados = parseNum(item.dias_adicionados);
        item.duraci_n_del_contrato = parseNum(item.duraci_n_del_contrato);

        // Clean text fields
        item.nombre_supervisor = item.nombre_supervisor?.trim() || 'No especificado';
        item.proveedor_adjudicado = item.proveedor_adjudicado?.trim() || 'No especificado';
        item.estado_contrato = item.estado_contrato?.trim() || 'No especificado';
        item.tipo_de_contrato = item.tipo_de_contrato?.trim() || 'No especificado';
        item.modalidad_de_contratacion = item.modalidad_de_contratacion?.trim() || 'No especificado';
        item.localizaci_n = item.localizaci_n?.trim() || '';
        item.entidad_centralizada = item.entidad_centralizada?.trim() || 'No especificado';
        item.orden = item.orden?.trim() || 'No especificado';
        item.sector = item.sector?.trim() || 'No especificado';
        item.rama = item.rama?.trim() || 'No especificado';

        deduplicated.push(item);
      }

      await CacheService.set(cacheKey, deduplicated, TTL_CONTRATOS);
      return deduplicated;
    } catch (e) {
      console.error(`Failed to fetch contracts for ${codigoEntidad} in period ${fechaDesde} to ${fechaHasta}:`, e);
      const staleData = await CacheService.get<Contrato[]>(cacheKey, true);
      if (staleData) return staleData;
      throw e;
    }
  }

  /**
   * Search entities globally by name or NIT
   */
  public static async searchEntidadesGlobal(searchText: string): Promise<EntidadResumen[]> {
    const clean = searchText.trim();
    if (!clean || clean.length < 3) return [];

    const isNumeric = /^\d+$/.test(clean);
    let whereClause = "";
    if (isNumeric) {
      whereClause = `(nit_entidad like '%${escapeSoQL(clean)}%' or codigo_entidad='${escapeSoQL(clean)}')`;
    } else {
      whereClause = `(lower(nombre_entidad) like '%${escapeSoQL(clean).toLowerCase()}%')`;
    }

    const fields = 'codigo_entidad,nombre_entidad,nit_entidad,departamento,ciudad';
    const whereParam = `${whereClause} and codigo_entidad is not null`;
    const url = `${BASE_URL}?$select=${encodeURIComponent(fields)}&$where=${encodeURIComponent(whereParam)}&$group=${encodeURIComponent(fields)}&$limit=100`;

    try {
      const response = await SecopApiService.fetchWithRetry(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      
      const entitiesMap = new Map<string, EntidadResumen>();
      for (const item of data) {
        const code = item.codigo_entidad?.trim();
        if (!code) continue;

        const record: EntidadResumen = {
          departamento: item.departamento?.trim() || 'No Definido',
          ciudad: item.ciudad?.trim() || 'No Definido',
          codigo_entidad: code,
          nombre_entidad: item.nombre_entidad?.trim() || '',
          nit_entidad: item.nit_entidad?.trim() || '',
          localizaci_n: '',
          orden: '',
          sector: '',
          rama: '',
          entidad_centralizada: '',
        };
        entitiesMap.set(code, record);
      }
      
      // Sort alphabetically by name in JavaScript
      return Array.from(entitiesMap.values()).sort((a, b) => 
        a.nombre_entidad.localeCompare(b.nombre_entidad)
      );
    } catch (e) {
      console.error('Failed to search entities globally:', e);
      return [];
    }
  }

  /**
   * Advanced search for entities using explicit NIT
   */
  public static async searchEntidadesAvanzada(nit: string): Promise<EntidadResumen[]> {
    const nitClean = nit.trim();

    if (!nitClean) return [];

    const whereClause = `nit_entidad='${escapeSoQL(nitClean)}'`;
    const fields = 'codigo_entidad,nombre_entidad,nit_entidad,departamento,ciudad';
    const whereParam = `${whereClause} and codigo_entidad is not null`;
    const url = `${BASE_URL}?$select=${encodeURIComponent(fields)}&$where=${encodeURIComponent(whereParam)}&$group=${encodeURIComponent(fields)}&$limit=150`;

    try {
      const response = await SecopApiService.fetchWithRetry(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      
      const entitiesMap = new Map<string, EntidadResumen>();
      for (const item of data) {
        const code = item.codigo_entidad?.trim();
        if (!code) continue;

        const record: EntidadResumen = {
          departamento: item.departamento?.trim() || 'No Definido',
          ciudad: item.ciudad?.trim() || 'No Definido',
          codigo_entidad: code,
          nombre_entidad: item.nombre_entidad?.trim() || '',
          nit_entidad: item.nit_entidad?.trim() || '',
          localizaci_n: '',
          orden: '',
          sector: '',
          rama: '',
          entidad_centralizada: '',
        };
        entitiesMap.set(code, record);
      }
      
      return Array.from(entitiesMap.values()).sort((a, b) => 
        a.nombre_entidad.localeCompare(b.nombre_entidad)
      );
    } catch (e) {
      console.error('Failed to search entities in advanced mode:', e);
      return [];
    }
  }
}
