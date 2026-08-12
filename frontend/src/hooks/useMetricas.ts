import { useState, useEffect, useMemo } from 'react';
import { Contrato } from '../types';
import { SimilarObjectGroup } from '../components/metricas/types';
import { useDashboard } from './useDashboard';
import { getSimilarity } from '../services/api';
import {
  calculateFinancialStats,
  calculateMonthlySignatureData,
  calculateStatusDistribution,
  calculateModalityDistribution,
  calculateTypeDistribution,
  calculateRepeatedObjects,
  calculateCitizenIndicators
} from '../utils/metricsEngine';

export function useMetricas(contratos: Contrato[]) {
  // --- 1. Aggregated financial statistics ---
  const stats = useMemo(() => {
    return calculateFinancialStats(contratos);
  }, [contratos]);

  // --- 2. Monthly Signature trend data ---
  const monthlyData = useMemo(() => {
    return calculateMonthlySignatureData(contratos);
  }, [contratos]);

  // --- 3. Status distribution data ---
  const statusData = useMemo(() => {
    return calculateStatusDistribution(contratos);
  }, [contratos]);

  // --- 4. Modality distribution data ---
  const modalityData = useMemo(() => {
    return calculateModalityDistribution(contratos);
  }, [contratos]);

  // --- 5. Contract Types distribution data ---
  const typeData = useMemo(() => {
    return calculateTypeDistribution(contratos);
  }, [contratos]);

  // --- 6. Repeated objects groupings ---
  const repeatedObjects = useMemo(() => {
    return calculateRepeatedObjects(contratos);
  }, [contratos]);

  // --- 7. Similar objects groups calculated in backend ---
  const [similarObjectsGroups, setSimilarObjectsGroups] = useState<SimilarObjectGroup[]>([]);
  const [isCalculatingSimilar, setIsCalculatingSimilar] = useState<boolean>(false);

  // Get these from somewhere else or we just rely on the first contract's info
  // For the sake of simplicity, we can extract the query parameters from the contracts list if needed,
  // or we can pass the QueryContext down. Since useMetricas only takes `contratos`, we can infer the
  // entity code from them, and use the URL params for dates.

  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      setSimilarObjectsGroups([]);
      setIsCalculatingSimilar(false);
      return;
    }

    let isCancelled = false;

    const fetchSimilarity = async () => {
      setIsCalculatingSimilar(true);
      try {
        // Infer filters from current contracts and window URL
        const codigoEntidad = contratos[0]?.codigo_entidad;
        const params = new URLSearchParams(window.location.search);
        const fechaDesde = params.get('fechaDesde') || '2023-01-01';
        const fechaHasta = params.get('fechaHasta') || '2023-12-31';

        if (!codigoEntidad) return;

        const filters = {
           codigoEntidad,
           fechaDesde,
           fechaHasta
        };
        const clusters = await getSimilarity(filters);
        if (!isCancelled) {
           setSimilarObjectsGroups(clusters);
        }
      } catch (err) {
        console.error('Failed to fetch similarity:', err);
      } finally {
        if (!isCancelled) {
           setIsCalculatingSimilar(false);
        }
      }
    };

    fetchSimilarity();

    return () => {
      isCancelled = true;
    };
  }, [contratos]);

  // --- 8. Citizen Warning Indicators ---
  const citizenIndicators = useMemo(() => {
    return calculateCitizenIndicators(contratos);
  }, [contratos]);

  return {
    stats,
    monthlyData,
    statusData,
    modalityData,
    typeData,
    repeatedObjects,
    similarObjectsGroups,
    citizenIndicators,
    isCalculatingSimilar
  };
}
