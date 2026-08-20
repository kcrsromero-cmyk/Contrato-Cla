import { useState } from 'react';
import { EntidadResumen } from '../types';
import { CacheService } from '../services/db';

export function useEntidad() {
  const [selectedEntity, setSelectedEntity] = useState<EntidadResumen | null>(null);

  const clearEntity = async () => {
    setSelectedEntity(null);
    try {
      await CacheService.clear();
      console.log('Caché de consultas IndexedDB limpiada con éxito al cambiar de entidad.');
    } catch (err) {
      console.error('Error al limpiar caché al cambiar de entidad:', err);
    }
  };

  const handleClearCache = async () => {
    await CacheService.clear();
    window.location.reload();
  };

  return {
    selectedEntity,
    setSelectedEntity,
    clearEntity,
    handleClearCache,
  };
}
