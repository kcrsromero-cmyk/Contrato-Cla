import { useState, useEffect, useMemo } from 'react';
import { Contrato } from '../types';
import { SimilarObjectGroup } from '../components/metricas/types';
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

  // --- 7. Similar objects groups calculated off the main thread using a Web Worker ---
  const [similarObjectsGroups, setSimilarObjectsGroups] = useState<SimilarObjectGroup[]>([]);
  const [isCalculatingSimilar, setIsCalculatingSimilar] = useState<boolean>(false);

  useEffect(() => {
    if (!contratos || contratos.length === 0) {
      setSimilarObjectsGroups([]);
      setIsCalculatingSimilar(false);
      return;
    }

    let isCancelled = false;
    setIsCalculatingSimilar(true);
    const requestId = Math.random().toString(36).substring(2, 9);

    let worker: Worker | null = null;

    try {
      worker = new Worker(
        new URL('../workers/similarityWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent) => {
        if (isCancelled) return;
        if (e.data.type === 'SIMILARITY_RESULT' && e.data.id === requestId) {
          setSimilarObjectsGroups(e.data.clusters);
          setIsCalculatingSimilar(false);
        }
      };

      worker.onerror = (err) => {
        console.warn('Similarity worker error, falling back:', err);
        if (!isCancelled) {
          setIsCalculatingSimilar(false);
        }
      };

      worker.postMessage({
        type: 'CALCULATE_SIMILARITY',
        id: requestId,
        contratos
      });
    } catch (err) {
      console.warn('Failed to launch similarity worker:', err);
      if (!isCancelled) {
        setIsCalculatingSimilar(false);
      }
    }

    return () => {
      isCancelled = true;
      if (worker) {
        worker.terminate();
      }
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
