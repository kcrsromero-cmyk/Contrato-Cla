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

export interface SemanaEnMes {
  numero: number;         // 1, 2, 3, 4, 5
  rangoLabel: string;     // 'DÍAS 1-7', 'DÍAS 8-14', etc.
  dias: DiaActividad[];   // objetos DiaActividad de esa semana
  contratos: number;
  valor: number;
  esPico: boolean;
  promedioPorDia: number;
  mayorDia: { nombre: string; dia: number; fecha: string; contratos: number } | null;
}

export interface MesActividad {
  key: string;           // 'YYYY-MM'
  label: string;         // 'Enero 2026'
  totalContratos: number;
  totalValor: number;
  dias: DiaActividad[];
  semanas: SemanaEnMes[];
}

export interface IndiceActividad {
  // KPIs principales
  totalContratos: number;
  totalValor: number;
  diasConFirmas: number;
  diasEnCero: number;
  totalDiasPeriodo: number;
  maximoDiario: { contratos: number; valor: number; dia: number; fecha: string }; // ACTUALIZADO: agrega fecha
  minimoDiario: number;            // MANTENER para compatibilidad (=minimoDiarioValor)
  minimoDiarioValor: number;       // NUEVO: mínimo no-cero (o 0 si todos son cero)
  minimoDiarioCount: number;       // NUEVO: cuántos días tienen ese mínimo
  minimoDiarioFinDeSemanaCount: number; // NUEVO: de esos días, cuántos son fin de semana
  promedioDiario: number;
  promedioHabil: number;
  medianaDiaria: number;
  valorPromedioPorContrato: number;
  variacionMensual: {              // ACTUALIZADO: de null a objeto tipado o null
    porcentaje: number;
    diferencia: number;
    mesActualLabel: string;        // ej: 'Septiembre'
    mesAnteriorLabel: string;      // ej: 'Agosto'
  } | null;

  // Distribuciones
  porDia: DiaActividad[];
  porSemana: SemanaActividad[];    // mantener por compatibilidad
  porDiaSemana: { dia: string; contratos: number; valor: number; porcentaje: number }[];
  porMes: MesActividad[];          // NUEVO: para vistas de semana y calendario multi-mes

  // Alertas
  firmasFinDeSemana: DiaActividad[];
  diasPico: DiaActividad[];
  mesConMayorConcentracion: string | null;

  // NUEVO: contratos del día pico (para modal "VER N CONTRATOS")
  contratosDelPico: string[];      // array de fecha_de_firma 'YYYY-MM-DD' del día pico
}

export function useActividadTemporal(
  contratos: Contrato[],
  fechaDesde: string,
  fechaHasta: string,
  allContratos?: Contrato[]  // NUEVO: todos los contratos sin filtro de mes, para calcular variación
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

    // Mínimo no-cero
    const valoresPositivos = diasConFirmas.map(d => d.contratos);
    const minimoValor = valoresPositivos.length > 0 ? Math.min(...valoresPositivos) : 0;
    const diasEnMinimo = porDia.filter(d => d.contratos === minimoValor && minimoValor > 0);
    const diasEnMinimoFinSemana = diasEnMinimo.filter(d => d.esFinDeSemana);

    const maximo = porDia.reduce(
      (max, d) => d.contratos > max.contratos ? d : max,
      porDia[0] || { contratos: 0, valor: 0, dia: 0, fecha: '' }
    );
    const promedio = porDia.length > 0 ? contratos.length / porDia.length : 0;
    const promedioHabil = diasConFirmas.length > 0 ? contratos.length / diasConFirmas.length : 0;
    const sorted = [...valoresPositivos].sort((a, b) => a - b);
    const mediana = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const media = promedio;
    const desviacion = Math.sqrt(porDia.reduce((s, d) => s + Math.pow(d.contratos - media, 2), 0) / porDia.length);

    // Por semana (dentro del mes del fechaDesde)
    const porSemana: SemanaActividad[] = [];
    let semanaActual = 1;
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

    // Variación mensual: comparar los 2 meses más recientes con datos
    let variacionMensual: IndiceActividad['variacionMensual'] = null;
    const NOMBRES_MES_COMPLETO: Record<string, string> = {
      '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
      '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
      '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
    };

    const fuenteVariacion = allContratos ?? contratos;
    const porMesVariacion = new Map<string, number>();
    fuenteVariacion.forEach(c => {
      if (!c.fecha_de_firma) return;
      const partes = c.fecha_de_firma.split('T')[0].split('-');
      if (partes.length < 3) return;
      const clave = `${partes[0]}-${partes[1]}`; // 'YYYY-MM'
      porMesVariacion.set(clave, (porMesVariacion.get(clave) || 0) + 1);
    });
    const mesesOrdenados = Array.from(porMesVariacion.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (mesesOrdenados.length >= 2) {
      const [claveAnterior, countAnterior] = mesesOrdenados[mesesOrdenados.length - 2];
      const [claveActual, countActual] = mesesOrdenados[mesesOrdenados.length - 1];
      const mesActualLabel = NOMBRES_MES_COMPLETO[claveActual.split('-')[1]] || claveActual;
      const mesAnteriorLabel = NOMBRES_MES_COMPLETO[claveAnterior.split('-')[1]] || claveAnterior;
      variacionMensual = {
        porcentaje: countAnterior > 0
          ? Math.round(((countActual - countAnterior) / countAnterior) * 1000) / 10
          : 100,
        diferencia: countActual - countAnterior,
        mesActualLabel,
        mesAnteriorLabel,
      };
    }

    // Agrupación por mes para vistas de Semana y Calendario
    const porMes: MesActividad[] = [];
    const diasPorMesMap = new Map<string, DiaActividad[]>();
    porDia.forEach(d => {
      const mesKey = d.fecha.substring(0, 7); // 'YYYY-MM'
      if (!diasPorMesMap.has(mesKey)) diasPorMesMap.set(mesKey, []);
      diasPorMesMap.get(mesKey)!.push(d);
    });

    const mesesOrdenadosParaMapa = Array.from(diasPorMesMap.keys()).sort();
    mesesOrdenadosParaMapa.forEach(mesKey => {
      const diasDelMes = diasPorMesMap.get(mesKey)!;
      const [anio, mes] = mesKey.split('-');
      const mesLabel = `${NOMBRES_MES_COMPLETO[mes] || mes} ${anio}`;

      // Dividir en semanas calendario (Dom–Sáb)
      const semanas: SemanaEnMes[] = [];
      let currentIdx = 0;
      let semanaNum = 1;

      while (currentIdx < diasDelMes.length) {
        // La semana termina en el primer Sábado (diaSemana === 6) o al final del mes
        let endIdx = currentIdx;
        while (endIdx < diasDelMes.length - 1 && diasDelMes[endIdx].diaSemana !== 6) {
          endIdx++;
        }

        const chunk = diasDelMes.slice(currentIdx, endIdx + 1);
        const diaInicio = chunk[0].dia;
        const diaFin = chunk[chunk.length - 1].dia;
        const totalChunk = chunk.reduce(
          (s, d) => ({ contratos: s.contratos + d.contratos, valor: s.valor + d.valor }),
          { contratos: 0, valor: 0 }
        );
        const mayorChunk = chunk.reduce((max, d) => d.contratos > max.contratos ? d : max, chunk[0]);

        semanas.push({
          numero: semanaNum,
          rangoLabel: `DÍAS ${diaInicio}-${diaFin}`,
          dias: chunk,
          contratos: totalChunk.contratos,
          valor: totalChunk.valor,
          esPico: false,
          promedioPorDia: Math.round((totalChunk.contratos / chunk.length) * 10) / 10,
          mayorDia: mayorChunk.contratos > 0
            ? { nombre: `${mayorChunk.nombreDia} ${mayorChunk.dia}`, dia: mayorChunk.dia, fecha: mayorChunk.fecha, contratos: mayorChunk.contratos }
            : null,
        });

        currentIdx = endIdx + 1;
        semanaNum++;
      }

      // Marcar semana pico dentro del mes
      if (semanas.length > 0) {
        const picoDeSemana = semanas.reduce((max, s) => s.contratos > max.contratos ? s : max, semanas[0]);
        picoDeSemana.esPico = true;
      }

      const totalMes = diasDelMes.reduce((s, d) => ({ contratos: s.contratos + d.contratos, valor: s.valor + d.valor }), { contratos: 0, valor: 0 });

      // Solo incluir meses que tienen al menos un contrato
      if (totalMes.contratos > 0) {
        porMes.push({ key: mesKey, label: mesLabel, totalContratos: totalMes.contratos, totalValor: totalMes.valor, dias: diasDelMes, semanas });
      }
    });

    return {
      totalContratos,
      totalValor: contratos.reduce((s, c) => s + (Number(c.valor_del_contrato) || 0), 0),
      diasConFirmas: diasConFirmas.length,
      diasEnCero: porDia.length - diasConFirmas.length,
      totalDiasPeriodo: porDia.length,
      maximoDiario: {
        contratos: maximo.contratos,
        valor: (maximo as DiaActividad).valor || 0,
        dia: (maximo as DiaActividad).dia || 0,
        fecha: (maximo as DiaActividad).fecha || '',
      },
      minimoDiario: minimoValor,           // compatibilidad
      minimoDiarioValor: minimoValor,
      minimoDiarioCount: diasEnMinimo.length,
      minimoDiarioFinDeSemanaCount: diasEnMinimoFinSemana.length,
      promedioDiario: Math.round(promedio * 10) / 10,
      promedioHabil: Math.round(promedioHabil * 10) / 10,
      medianaDiaria: mediana,
      valorPromedioPorContrato: totalContratos > 0
        ? contratos.reduce((s, c) => s + (Number(c.valor_del_contrato) || 0), 0) / totalContratos
        : 0,
      variacionMensual,
      porDia,
      porSemana,
      porDiaSemana,
      porMes,
      firmasFinDeSemana: porDia.filter(d => d.esFinDeSemana && d.contratos > 0),
      diasPico: porDia.filter(d => d.contratos > media + desviacion),
      mesConMayorConcentracion: diaMayorConc.contratos > 0 ? diaMayorConc.dia : null,
      contratosDelPico: maximo.contratos > 0 && (maximo as DiaActividad).fecha
        ? [(maximo as DiaActividad).fecha]  // guardar la fecha del pico para filtrado en el componente
        : [],
    };
  }, [contratos, fechaDesde, fechaHasta, allContratos]);
}
