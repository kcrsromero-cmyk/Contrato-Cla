export interface EstadoConfig {
  colorClass: string;
  dotClass: string;
  label: string;
}

export function getEstadoSemaforoConfig(estado: string): EstadoConfig {
  const clean = (estado || '').trim().toLowerCase();

  // Verde: Activo / En curso normal
  if (clean === 'en ejecución' || clean === 'en ejecucion' || clean === 'aprobado') {
    return {
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-500',
      label: estado || 'En ejecución'
    };
  }

  // Azul: Finalizado correctamente
  if (clean === 'cerrado' || clean === 'terminado' || clean === 'liquidado') {
    return {
      colorClass: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      dotClass: 'bg-indigo-500',
      label: estado || 'Terminado'
    };
  }

  // Ámbar: En trámite / Modificación / Prórroga
  if (
    clean === 'prorrogado' ||
    clean === 'modificado' ||
    clean === 'enviado proveedor' ||
    clean === 'en aprobación' ||
    clean === 'en aprobacion'
  ) {
    return {
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      label: estado || 'En trámite'
    };
  }

  // Rojo: Interrumpido / Cancelado / Cedido
  if (
    clean === 'cancelado' ||
    clean === 'cedido' ||
    clean === 'suspendido'
  ) {
    return {
      colorClass: 'bg-rose-50 text-rose-800 border-rose-200',
      dotClass: 'bg-rose-500 animate-pulse',
      label: estado || 'Interrumpido'
    };
  }

  // Gris: Borrador / Desconocido
  return {
    colorClass: 'bg-slate-50 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
    label: estado || 'Desconocido'
  };
}

export function renderEstadoSemaforo(estado: string): string {
  return estado; // el renderizado JSX queda en cada componente
}
