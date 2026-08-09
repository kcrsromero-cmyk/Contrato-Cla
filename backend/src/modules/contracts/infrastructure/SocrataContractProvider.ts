import { Contract } from '../domain/Contract';
import { IContractProvider } from '../domain/IContractProvider';

export class SocrataContractProvider implements IContractProvider {
  private readonly BASE_URL = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';

  // Fallback naive escape mechanism
  private escapeSoQL(val: string): string {
    if (!val) return '';
    return val.replace(/'/g, "''");
  }

  async getContractsByEntity(
    codigoEntidad: string,
    fechaDesde: string,
    fechaHasta: string
  ): Promise<Contract[]> {
    const selectFields = [
      'nombre_entidad', 'codigo_entidad', 'nit_entidad', 'departamento', 'ciudad',
      'id_contrato', 'referencia_del_contrato', 'proceso_de_compra', 'urlproceso',
      'estado_contrato', 'tipo_de_contrato', 'modalidad_de_contratacion',
      'justificacion_modalidad_de', 'objeto_del_contrato', 'descripcion_del_proceso',
      'condiciones_de_entrega', 'fecha_de_firma', 'fecha_de_inicio_del_contrato',
      'fecha_de_fin_del_contrato', 'ultima_actualizacion', 'tipodocproveedor',
      'documento_proveedor', 'proveedor_adjudicado', 'codigo_proveedor',
      'valor_del_contrato', 'valor_de_pago_adelantado', 'valor_facturado',
      'valor_pagado', 'valor_pendiente_de_pago', 'valor_pendiente_de_ejecucion',
      'saldo_cdp', 'nombre_supervisor', 'nombre_ordenador_del_gasto',
      'duraci_n_del_contrato', 'dias_adicionados', 'el_contrato_puede_ser_prorrogado',
      'localizaci_n', 'entidad_centralizada', 'orden', 'sector', 'rama'
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
      const url = `${this.BASE_URL}${encodeURI(query)}`;

      let response: Response;
      try {
        response = await fetch(url);
      } catch (err) {
        throw new Error(`Failed to fetch from Socrata: ${(err as Error).message}`);
      }

      if (!response.ok) {
        if (response.status === 429) {
          // Implement simple backoff in a real-world scenario or retry mechanism
          // for the sake of simplicity, throwing here.
          throw new Error('Rate limit exceeded (429) from Socrata');
        }
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

    // Map to Canonical Model and deduplicate
    const deduplicated: Contract[] = [];
    const seenIds = new Set<string>();

    for (const item of allData) {
      if (!item.id_contrato) continue;
      const cleanId = item.id_contrato.trim();
      if (seenIds.has(cleanId)) continue;
      seenIds.add(cleanId);

      const parseNum = (val: any) => {
        if (val === undefined || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      deduplicated.push({
        id_contrato: cleanId,
        nombre_entidad: item.nombre_entidad?.trim() || '',
        nit_entidad: item.nit_entidad?.trim(),
        codigo_entidad: item.codigo_entidad?.trim() || '',
        departamento: item.departamento?.trim() || '',
        ciudad: item.ciudad?.trim() || '',

        referencia_del_contrato: item.referencia_del_contrato?.trim(),
        proceso_de_compra: item.proceso_de_compra?.trim(),
        urlproceso: item.urlproceso,
        estado_contrato: item.estado_contrato?.trim() || 'No especificado',
        tipo_de_contrato: item.tipo_de_contrato?.trim() || 'No especificado',
        modalidad_de_contratacion: item.modalidad_de_contratacion?.trim() || 'No especificado',
        justificacion_modalidad_de: item.justificacion_modalidad_de?.trim(),
        objeto_del_contrato: item.objeto_del_contrato?.trim() || '',
        descripcion_del_proceso: item.descripcion_del_proceso?.trim(),
        condiciones_de_entrega: item.condiciones_de_entrega?.trim(),
        fecha_de_firma: item.fecha_de_firma,
        fecha_de_inicio_del_contrato: item.fecha_de_inicio_del_contrato,
        fecha_de_fin_del_contrato: item.fecha_de_fin_del_contrato,
        ultima_actualizacion: item.ultima_actualizacion,

        tipodocproveedor: item.tipodocproveedor?.trim(),
        documento_proveedor: item.documento_proveedor?.trim(),
        proveedor_adjudicado: item.proveedor_adjudicado?.trim() || 'No especificado',
        codigo_proveedor: item.codigo_proveedor?.trim(),

        valor_del_contrato: parseNum(item.valor_del_contrato),
        valor_de_pago_adelantado: parseNum(item.valor_de_pago_adelantado),
        valor_facturado: parseNum(item.valor_facturado),
        valor_pagado: parseNum(item.valor_pagado),
        valor_pendiente_de_pago: parseNum(item.valor_pendiente_de_pago),
        valor_pendiente_de_ejecucion: parseNum(item.valor_pendiente_de_ejecucion),
        saldo_cdp: parseNum(item.saldo_cdp),

        nombre_supervisor: item.nombre_supervisor?.trim() || 'No especificado',
        tipo_de_documento_supervisor: item.tipo_de_documento_supervisor?.trim(),
        nombre_ordenador_del_gasto: item.nombre_ordenador_del_gasto?.trim(),

        duraci_n_del_contrato: parseNum(item.duraci_n_del_contrato),
        dias_adicionados: parseNum(item.dias_adicionados),
        el_contrato_puede_ser_prorrogado: item.el_contrato_puede_ser_prorrogado?.trim(),
        direcci_n_de_ejecuci_n_del_contrato: item.direcci_n_de_ejecuci_n_del_contrato?.trim(),
        localizaci_n: item.localizaci_n?.trim() || '',
        entidad_centralizada: item.entidad_centralizada?.trim() || 'No especificado',
        orden: item.orden?.trim() || 'No especificado',
        sector: item.sector?.trim() || 'No especificado',
        rama: item.rama?.trim() || 'No especificado'
      });
    }

    return deduplicated;
  }
}
