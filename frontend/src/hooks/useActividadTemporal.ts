import { useMemo } from 'react';
import { Contrato } from '../types';

export interface DiaActividad {
  fecha: string;        // 'YYYY-MM-DD'
  dia: number;          // día del mes
  diaSemana: number;    // 0=Dom, 1=Lun...6=Sáb
  nombreDia: string;    // 'Lunes'
  esFinDeSemana: boolean;
  contratos: number;
  valor: number;
}

export interface SemanaActividad {
  semana: number;       // 1-5
  dias: string[];       // fechas de esa semana en el mes
  contratos: number;
  valor: number;
  esPico: boolean;
  mayorDia: { nombre: string; contratos: number } | null;
}

export interface IndiceActividad {
  // KPIs principales
  totalContratos: number;
  totalValor: number;
  diasConFirmas: number;
  diasEnCero: number;
  totalDiasPeriodo: number;
  maximoDiario: { contratos: number; valor: number; dia: number };
  minimoDiario: number;
  promedioDiario: number;
  promedioHabil: number;
  medianaDiaria: number;
  valorPromedioPorContrato: number;
  variacionMensual: number | null;    // % vs mes anterior

  // Distribuciones
  porDia: DiaActividad[];
  porSemana: SemanaActividad[];
  porDiaSemana: { dia: string; contratos: number; valor: number; porcentaje: number }[];

  // Alertas
  firmasFinDeSemana: DiaActividad[];
  diasPico: DiaActividad[];           // > media + 1 desv. estándar
  mesConMayorConcentracion: string | null;
}

export function useActividadTemporal(
  contratos: Contrato[],
  fechaDesde: string,
  fechaHasta: string
): IndiceActividad {
  return useMemo(() => {
    const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Agrupar por día
    const porDiaMap = new Map<string, { contratos: number; valor: number }>();
    contratos.forEach(c => {
      if (!c.fecha_de_firma) return;
      const fecha = c.fecha_de_firma.split('T')[0];
      const existing = porDiaMap.get(fecha) || { contratos: 0, valor: 0 };
      porDiaMap.set(fecha, {
        contratos: existing.contratos + 1,
        valor: existing.valor + (Number(c.valor_del_contrato) || 0)
      });
    });

    // Generar todos los días del rango
    const inicio = new Date(fechaDesde + 'T00:00:00');
    const fin = new Date(fechaHasta + 'T00:00:00');
    const porDia: DiaActividad[] = [];

    for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      const fecha = d.toISOString().split('T')[0];
      const diaSemana = d.getDay();
      const data = porDiaMap.get(fecha) || { contratos: 0, valor: 0 };
      porDia.push({
        fecha,
        dia: d.getDate(),
        diaSemana,
        nombreDia: NOMBRES_DIA[diaSemana],
        esFinDeSemana: diaSemana === 0 || diaSemana === 6,
        contratos: data.contratos,
        valor: data.valor
      });
    }

    // KPIs
    const diasConFirmas = porDia.filter(d => d.contratos > 0);
    const valoresContratos = diasConFirmas.map(d => d.contratos);
    const maximo = porDia.reduce((max, d) => d.contratos > max.contratos ? d : max, porDia[0] || { contratos: 0, valor: 0, dia: 0 });
    const promedio = porDia.length > 0 ? contratos.length / porDia.length : 0;
    const promedioHabil = diasConFirmas.length > 0 ? contratos.length / diasConFirmas.length : 0;
    const sorted = [...valoresContratos].sort((a, b) => a - b);
    const mediana = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const media = promedio;
    const desviacion = Math.sqrt(porDia.reduce((s, d) => s + Math.pow(d.contratos - media, 2), 0) / porDia.length);

    // Por semana (dentro del mes del fechaDesde)
    const porSemana: SemanaActividad[] = [];
    let semanaActual = 1;
    let diaEnSemana = new Date(fechaDesde + 'T00:00:00').getDay();
    let semana: DiaActividad[] = [];

    porDia.forEach(d => {
      semana.push(d);
      if (d.diaSemana === 6 || d === porDia[porDia.length - 1]) {
        const totalSemana = semana.reduce((s, x) => ({ contratos: s.contratos + x.contratos, valor: s.valor + x.valor }), { contratos: 0, valor: 0 });
        const mayorDiaSemana = semana.reduce((max, x) => x.contratos > max.contratos ? x : max, semana[0]);
        porSemana.push({
          semana: semanaActual++,
          dias: semana.map(x => x.fecha),
          contratos: totalSemana.contratos,
          valor: totalSemana.valor,
          esPico: false,
          mayorDia: mayorDiaSemana.contratos > 0 ? { nombre: `${mayorDiaSemana.nombreDia} ${mayorDiaSemana.dia}`, contratos: mayorDiaSemana.contratos } : null
        });
        semana = [];
      }
    });

    // Marcar semana pico
    if (porSemana.length > 0) {
      const semPico = porSemana.reduce((max, s) => s.contratos > max.contratos ? s : max, porSemana[0]);
      semPico.esPico = true;
    }

    // Por día de semana agregado
    const porDiaSemanaMap = new Map<number, { contratos: number; valor: number }>();
    porDia.forEach(d => {
      const ex = porDiaSemanaMap.get(d.diaSemana) || { contratos: 0, valor: 0 };
      porDiaSemanaMap.set(d.diaSemana, { contratos: ex.contratos + d.contratos, valor: ex.valor + d.valor });
    });
    const totalContratos = contratos.length;
    const porDiaSemana = NOMBRES_DIA.map((nombre, i) => {
      const data = porDiaSemanaMap.get(i) || { contratos: 0, valor: 0 };
      return { dia: nombre, contratos: data.contratos, valor: data.valor, porcentaje: totalContratos > 0 ? (data.contratos / totalContratos) * 100 : 0 };
    });
    const diaMayorConc = porDiaSemana.reduce((max, d) => d.contratos > max.contratos ? d : max, porDiaSemana[0]);

    return {
      totalContratos,
      totalValor: contratos.reduce((s, c) => s + (Number(c.valor_del_contrato) || 0), 0),
      diasConFirmas: diasConFirmas.length,
      diasEnCero: porDia.length - diasConFirmas.length,
      totalDiasPeriodo: porDia.length,
      maximoDiario: { contratos: maximo.contratos, valor: (maximo as any).valor || 0, dia: (maximo as any).dia || 0 },
      minimoDiario: 0,
      promedioDiario: Math.round(promedio * 10) / 10,
      promedioHabil: Math.round(promedioHabil * 10) / 10,
      medianaDiaria: mediana,
      valorPromedioPorContrato: totalContratos > 0 ? contratos.reduce((s, c) => s + (Number(c.valor_del_contrato) || 0), 0) / totalContratos : 0,
      variacionMensual: null,
      porDia,
      porSemana,
      porDiaSemana,
      firmasFinDeSemana: porDia.filter(d => d.esFinDeSemana && d.contratos > 0),
      diasPico: porDia.filter(d => d.contratos > media + desviacion),
      mesConMayorConcentracion: diaMayorConc.contratos > 0 ? diaMayorConc.dia : null,
    };
  }, [contratos, fechaDesde, fechaHasta]);
}