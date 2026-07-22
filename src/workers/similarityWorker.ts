import { Contrato } from '../types';
import { SimilarObjectGroup } from '../components/metricas/types';
import { getNormalizedWords, computeJaccardWithSets } from '../utils/metricsEngine';
import { normalizeName } from '../utils/helpers';

self.onmessage = (event: MessageEvent) => {
  const { type, id, contratos } = event.data;

  if (type === 'CALCULATE_SIMILARITY') {
    if (!contratos || contratos.length === 0) {
      self.postMessage({ type: 'SIMILARITY_RESULT', id, clusters: [] });
      return;
    }

    // 1. Group exact objects
    const exactGroups: { [key: string]: { originalObject: string; contracts: Contrato[] } } = {};
    contratos.forEach((c: Contrato) => {
      const obj = c.objeto_del_contrato?.trim();
      if (!obj) return;
      const normalizedKey = obj.toUpperCase().replace(/\s+/g, ' ');
      if (!exactGroups[normalizedKey]) {
        exactGroups[normalizedKey] = { originalObject: obj, contracts: [] };
      }
      exactGroups[normalizedKey].contracts.push(c);
    });

    // 2. Prepare items with token sets
    const items = Object.entries(exactGroups)
      .map(([key, value]) => {
        const words = getNormalizedWords(value.originalObject);
        return {
          key,
          originalObject: value.originalObject,
          contracts: value.contracts,
          words,
          wordSet: new Set(words)
        };
      })
      .filter(item => item.words.length > 0);

    // 3. Build Inverted Index: token -> array of item indices
    const invertedIndex = new Map<string, number[]>();
    items.forEach((item, idx) => {
      item.words.forEach(w => {
        let list = invertedIndex.get(w);
        if (!list) {
          list = [];
          invertedIndex.set(w, list);
        }
        list.push(idx);
      });
    });

    // 4. Order pool by largest contract groups first
    const itemIndices = items.map((_, idx) => idx);
    itemIndices.sort((a, b) => items[b].contracts.length - items[a].contracts.length);

    const visited = new Uint8Array(items.length);
    const clusters: SimilarObjectGroup[] = [];

    for (let p = 0; p < itemIndices.length; p++) {
      const repIdx = itemIndices[p];
      if (visited[repIdx]) continue;
      visited[repIdx] = 1;

      const rep = items[repIdx];
      const clusterMemberIndices = [repIdx];

      // Query inverted index for candidate indices sharing at least 1 token
      const candidateIndices = new Set<number>();
      for (const word of rep.words) {
        const matches = invertedIndex.get(word);
        if (matches) {
          for (const mIdx of matches) {
            if (!visited[mIdx]) {
              candidateIndices.add(mIdx);
            }
          }
        }
      }

      // Compute Jaccard only for pre-filtered candidate indices
      for (const otherIdx of candidateIndices) {
        const other = items[otherIdx];

        // Length bound pruning
        const minSize = rep.words.length * 0.55;
        const maxSize = rep.words.length / 0.55;
        if (other.words.length < minSize || other.words.length > maxSize) {
          continue;
        }

        const sim = computeJaccardWithSets(rep.wordSet, other.wordSet);
        if (sim >= 0.55) {
          visited[otherIdx] = 1;
          clusterMemberIndices.push(otherIdx);
        }
      }

      if (clusterMemberIndices.length >= 2) {
        const clusterMembers = clusterMemberIndices.map(i => items[i]);
        const allContracts = clusterMembers.flatMap(m => m.contracts);
        const totalValue = allContracts.reduce((acc, c) => acc + (Number(c.valor_del_contrato) || 0), 0);
        const uniqueObjects = Array.from(new Set(clusterMembers.map(m => m.originalObject)));

        const contractorsSet = new Set<string>();
        allContracts.forEach(c => {
          if (c.proveedor_adjudicado) {
            contractorsSet.add(normalizeName(c.proveedor_adjudicado));
          }
        });

        clusters.push({
          representativeObject: rep.originalObject,
          contracts: allContracts,
          uniqueObjects,
          totalValue,
          count: allContracts.length,
          uniqueContractors: Array.from(contractorsSet)
        });
      }
    }

    clusters.sort((a, b) => b.count - a.count);
    self.postMessage({ type: 'SIMILARITY_RESULT', id, clusters });
  }
};
