import { ContractProvider } from '../domain/ContractProvider';
import { Contract, FilterParams } from '../domain/types';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';

export class SocrataContractProvider implements ContractProvider {
  private baseUrl = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';
  private cacheAdapter: RedisCacheAdapter;

  constructor() {
    this.cacheAdapter = new RedisCacheAdapter();
  }

  async fetchContracts(filters: FilterParams): Promise<Contract[]> {
    const { codigoEntidad, fechaDesde, fechaHasta } = filters;

    // Select required fields
    // NOTA DE PRIVACIDAD DELIBERADA:
    // Los campos 'nombre_representante_legal', 'domicilio_representante_legal',
    // 'identificaci_n_representante_legal' y el resto de ese clúster NUNCA deben
    // ser incluidos en este array de selección. Aunque están disponibles en la
    // fuente de datos de Socrata, su exclusión es una decisión de privacidad
    // deliberada y no una omisión accidental.
    const selectFields = [
      'id_contrato',
      'referencia_del_contrato',
      'estado_contrato',
      'tipo_de_contrato',
      'modalidad_de_contratacion',
      'justificacion_modalidad_de',
      'objeto_del_contrato',
      'condiciones_de_entrega',
      'fecha_de_firma',
      'fecha_de_inicio_del_contrato',
      'fecha_de_fin_del_contrato',
      'ultima_actualizacion',
      'valor_del_contrato',
      'valor_de_pago_adelantado',
      'valor_facturado',
      'valor_pagado',
      'valor_pendiente_de_pago',
      'valor_pendiente_de_ejecucion',
      'saldo_cdp',
      'duraci_n_del_contrato',
      'dias_adicionados',
      'el_contrato_puede_ser_prorrogado',
      'localizaci_n',
      'entidad_centralizada',
      'orden',
      'sector',
      'rama',
      'nombre_supervisor',
      'nombre_ordenador_del_gasto',
      'departamento',
      'ciudad',
      'nombre_entidad',
      'codigo_entidad',
      'nit_entidad',
      'proveedor_adjudicado',
      'codigo_proveedor',
      'proceso_de_compra',
      'urlproceso'
    ].join(',');

    const escapedCodigo = this.escapeSoQL(codigoEntidad);

    const whereClause = [
      `codigo_entidad='${escapedCodigo}'`,
      `fecha_de_firma >= '${fechaDesde}T00:00:00.000'`,
      `fecha_de_firma <= '${fechaHasta}T23:59:59.999'`
    ].join(' and ');

    const orderClause = `fecha_de_firma DESC, id_contrato ASC`;
    const limit = 5000;

    let allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const query = `?$select=${selectFields}&$where=${whereClause}&$order=${orderClause}&$limit=${limit}&$offset=${offset}`;
      const url = `${this.baseUrl}${encodeURI(query)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      allData = allData.concat(data);

      if (data.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    const domainData = this.mapToDomain(allData);

    return domainData;
  }

  private escapeSoQL(text: string): string {
    return text.replace(/'/g, "''");
  }

  private parseNum(val: any): number {
    if (val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  async getDepartments(): Promise<string[]> {
    const query = `?$select=distinct departamento&$order=departamento&$where=departamento is not null&$limit=100`;
    const response = await fetch(`${this.baseUrl}${encodeURI(query)}`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    const list = data
      .map((item: any) => item.departamento)
      .filter((dept: string) => dept && dept.trim() !== '' && dept !== 'No Definido')
      .map((dept: string) => dept.trim());
    return Array.from(new Set(list)).sort((a: any, b: any) => a.localeCompare(b)) as string[];
  }

  async getCities(department: string): Promise<string[]> {
    const escapedDept = this.escapeSoQL(department);
    const query = `?$select=distinct ciudad&$where=departamento='${escapedDept}'&$order=ciudad&$limit=1000`;
    const response = await fetch(`${this.baseUrl}${encodeURI(query)}`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    const list = data
      .map((item: any) => item.ciudad)
      .filter((c: string) => c && c.trim() !== '')
      .map((c: string) => c.trim());

    const uniqueList = Array.from(new Set(list)).sort((a: any, b: any) => a.localeCompare(b));
    const indexNoDef = uniqueList.findIndex((c: any) => c.toLowerCase() === 'no definido');
    if (indexNoDef !== -1) {
      uniqueList.splice(indexNoDef, 1);
      uniqueList.unshift('No Definido');
    }
    return uniqueList as string[];
  }

  async getEntities(department: string, city: string): Promise<any[]> {
    const escapedDept = this.escapeSoQL(department);
    const escapedCity = this.escapeSoQL(city);
    let whereClause = `departamento='${escapedDept}' and ciudad='${escapedCity}'`;

    if (city === 'No Definido') {
      whereClause = `departamento='${escapedDept}' and (ciudad is null or ciudad='No Definido')`;
    }

    const fields = 'codigo_entidad,nombre_entidad,nit_entidad,departamento,ciudad';
    const whereParam = `${whereClause} and codigo_entidad is not null`;
    const query = `?$select=${encodeURIComponent(fields)}&$where=${encodeURIComponent(whereParam)}&$group=${encodeURIComponent(fields)}&$limit=500`;

    const response = await fetch(`${this.baseUrl}${query}`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();

    const entitiesMap = new Map<string, any>();
    for (const item of data) {
      const code = item.codigo_entidad?.trim();
      if (!code) continue;
      entitiesMap.set(code, {
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
      });
    }

    return Array.from(entitiesMap.values()).sort((a, b) =>
      a.nombre_entidad.localeCompare(b.nombre_entidad)
    );
  }

  async searchEntities(searchText: string, type: 'global' | 'advanced'): Promise<any[]> {
    const clean = searchText.trim();
    if (!clean) return [];

    let whereClause = "";
    if (type === 'advanced') {
      whereClause = `nit_entidad='${this.escapeSoQL(clean)}'`;
    } else {
      if (clean.length < 3) return [];
      const isNumeric = /^\\d+$/.test(clean);
      if (isNumeric) {
        whereClause = `(nit_entidad like '%${this.escapeSoQL(clean)}%' or codigo_entidad='${this.escapeSoQL(clean)}')`;
      } else {
        whereClause = `(lower(nombre_entidad) like '%${this.escapeSoQL(clean).toLowerCase()}%')`;
      }
    }

    const fields = 'codigo_entidad,nombre_entidad,nit_entidad,departamento,ciudad';
    const whereParam = `${whereClause} and codigo_entidad is not null`;
    const limit = type === 'advanced' ? 150 : 100;
    const query = `?$select=${encodeURIComponent(fields)}&$where=${encodeURIComponent(whereParam)}&$group=${encodeURIComponent(fields)}&$limit=${limit}`;

    const response = await fetch(`${this.baseUrl}${query}`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();

    const entitiesMap = new Map<string, any>();
    for (const item of data) {
      const code = item.codigo_entidad?.trim();
      if (!code) continue;
      entitiesMap.set(code, {
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
      });
    }

    return Array.from(entitiesMap.values()).sort((a, b) =>
      a.nombre_entidad.localeCompare(b.nombre_entidad)
    );
  }

  async getContractYears(entityCode: string): Promise<string[]> {
    const escapedCodigo = this.escapeSoQL(entityCode);
    const query = `?$select=date_extract_y(fecha_de_firma) as anio&$where=codigo_entidad='${escapedCodigo}' and fecha_de_firma IS NOT NULL&$group=anio&$order=anio DESC&$limit=50`;

    const response = await fetch(`${this.baseUrl}${encodeURI(query)}`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    const anios = data
      .map((item: any) => item.anio?.trim())
      .filter(Boolean) as string[];

    anios.sort((a, b) => b.localeCompare(a));
    return anios;
  }

  private mapToDomain(data: any[]): Contract[] {
    const deduplicated: Contract[] = [];
    const seenIds = new Set<string>();

    for (const item of data) {
      if (!item.id_contrato) continue;
      const cleanId = item.id_contrato.trim();
      if (seenIds.has(cleanId)) continue;
      seenIds.add(cleanId);

      const contract: Contract = {
        id: cleanId, // Using id_contrato as domain ID initially, will be mapped to DB UUID later if persisted
        contractId: cleanId,
        reference: item.referencia_del_contrato,
        status: item.estado_contrato,
        contractType: item.tipo_de_contrato,
        modality: item.modalidad_de_contratacion,
        justification: item.justificacion_modalidad_de,
        object: item.objeto_del_contrato,
        deliveryConditions: item.condiciones_de_entrega,

        signatureDate: item.fecha_de_firma ? new Date(item.fecha_de_firma) : undefined,
        startDate: item.fecha_de_inicio_del_contrato ? new Date(item.fecha_de_inicio_del_contrato) : undefined,
        endDate: item.fecha_de_fin_del_contrato ? new Date(item.fecha_de_fin_del_contrato) : undefined,
        lastUpdate: item.ultima_actualizacion ? new Date(item.ultima_actualizacion) : undefined,

        contractValue: this.parseNum(item.valor_del_contrato),
        advancePaymentValue: this.parseNum(item.valor_de_pago_adelantado),
        invoicedValue: this.parseNum(item.valor_facturado),
        paidValue: this.parseNum(item.valor_pagado),
        pendingPaymentValue: this.parseNum(item.valor_pendiente_de_pago),
        pendingExecutionValue: this.parseNum(item.valor_pendiente_de_ejecucion),
        cdpBalance: this.parseNum(item.saldo_cdp),

        duration: this.parseNum(item.duraci_n_del_contrato),
        addedDays: this.parseNum(item.dias_adicionados),
        isExtendable: item.el_contrato_puede_ser_prorrogado,

        location: item.localizaci_n,
        centralizedEntity: item.entidad_centralizada,
        order: item.orden,
        sector: item.sector,
        branch: item.rama,

        supervisorName: item.nombre_supervisor,
        spenderName: item.nombre_ordenador_del_gasto,

        department: item.departamento,
        city: item.ciudad,
        entityName: item.nombre_entidad,
        entityCode: item.codigo_entidad,
        entityNit: item.nit_entidad,

        supplierName: item.proveedor_adjudicado,
        procurementProcessId: item.proceso_de_compra,
        urlproceso: item.urlproceso?.url || item.urlproceso || null,
      };

      deduplicated.push(contract);
    }
    return deduplicated;
  }
}
