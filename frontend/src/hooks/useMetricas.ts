import { useAuth } from '../context/AuthContext';
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

export function useMetricas(contratos: Contrato[], fechaDesde: string, fechaHasta: string) {
  const { capabilities } = useAuth();
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
        const codigoEntidad = contratos[0]?.codigo_entidad;

        if (!codigoEntidad) return;
        if (!capabilities?.includes('VIEW_SIMILARITY_ANALYSIS')) {
          setSimilarObjectsGroups([]);
          setIsCalculatingSimilar(false);
          return;
        }

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
  }, [contratos, fechaDesde, fechaHasta, capabilities]);

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
