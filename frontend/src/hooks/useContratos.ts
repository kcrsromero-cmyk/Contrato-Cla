import { useState, useEffect } from 'react';
import { Contrato, EntidadResumen } from '../types';
import { CacheService } from '../services/db';
import { getContracts } from '../services/api';
import { mapContractToViewModel } from '../utils/contractAdapter';

export function useContratos(
  selectedEntity: EntidadResumen | null,
  fechaDesde: string,
  fechaHasta: string
) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dbSize, setDbSize] = useState<number>(0);

  const updateDbSize = async () => {
    try {
      const size = await CacheService.getDatabaseSize();
      setDbSize(size);
    } catch (e) {
      console.warn('Failed to update DB size state:', e);
    }
  };

  const loadContracts = async (forceRefresh: boolean = false) => {
    if (!selectedEntity) {
      setContratos([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getContracts({
         codigoEntidad: selectedEntity.codigo_entidad,
         fechaDesde,
         fechaHasta
      });
      setContratos(data.map(mapContractToViewModel));
      setLastUpdated(
        new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      await updateDbSize();
    } catch (err: any) {
      console.error(err);
      setError(
        'No se pudieron obtener los contratos. Por favor intente nuevamente o elija otro periodo/entidad.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEntity) {
      setContratos([]);
      return;
    }
    loadContracts(false);
  }, [selectedEntity, fechaDesde, fechaHasta]);

  useEffect(() => {
    updateDbSize();
  }, []);

  return {
    contratos,
    setContratos,
    loading,
    error,
    setError,
    lastUpdated,
    loadContracts,
    dbSize,
    updateDbSize,
  };
}
