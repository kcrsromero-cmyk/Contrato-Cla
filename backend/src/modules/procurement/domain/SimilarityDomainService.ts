import { Contract } from './types';

export interface SimilarObjectGroup {
  representativeObject: string;
  contracts: Contract[];
  uniqueObjects: string[];
  totalValue: number;
  count: number;
  uniqueContractors: string[];
}

export class SimilarityDomainService {
  /**
   * Helper function to normalize text and extract words.
   * Based on the logic from frontend/src/utils/metricsEngine.ts
   */
  private getNormalizedWords(text: string): string[] {
    const stopwords = new Set([
      'DE', 'LA', 'EL', 'Y', 'A', 'EN', 'QUE', 'LOS', 'DEL', 'LAS', 'POR', 'CON', 'PARA',
      'UNA', 'UN', 'SE', 'NO', 'SU', 'AL', 'LO', 'COMO', 'MÁS', 'PERO', 'SUS', 'LE', 'YA',
      'O', 'ESTE', 'SÍ', 'PORQUE', 'ESTA', 'ENTRE', 'CUANDO', 'MUY', 'SIN', 'SOBRE', 'TAMBIÉN',
      'ME', 'HASTA', 'HAY', 'DONDE', 'QUIEN', 'DESDE', 'TODO', 'NOS', 'DURANTE', 'TODOS',
      'UNO', 'LES', 'NI', 'CONTRA', 'OTROS', 'ESE', 'ESO', 'ANTE', 'ELLOS', 'E', 'ESTO', 'MÍ',
      'ANTES', 'ALGUNOS', 'QUÉ', 'UNOS', 'YO', 'OTRO', 'OTRAS', 'OTRA', 'ÉL', 'TANTO', 'ESA',
      'ESTOS', 'MUCHO', 'QUIENES', 'NADA', 'MUCHOS', 'CUAL', 'POCO', 'ELLA', 'ESTAR', 'ESTAS',
      'ALGUNAS', 'ALGO', 'NOSOTROS', 'MI', 'MIS', 'TÚ', 'TE', 'TI', 'TU', 'TUS', 'ELLAS', 'NOSOTRAS',
      'VOSOTROS', 'VOSOTRAS', 'OS', 'MÍO', 'MÍA', 'MÍOS', 'MÍAS', 'TUYO', 'TUYA', 'TUYOS', 'TUYAS',
      'SUYO', 'SUYA', 'SUYOS', 'SUYAS', 'NUESTRO', 'NUESTRA', 'NUESTROS', 'NUESTRAS', 'VUESTRO',
      'VUESTRA', 'VUESTROS', 'VUESTRAS', 'ESOS', 'ESAS', 'AQUEL', 'AQUELLA', 'AQUELLOS', 'AQUELLAS',
      'CUALES', 'QUIÉN', 'QUIÉNES', 'PRESTACION', 'SERVICIOS', 'APOYO', 'GESTION', 'MUNICIPIO', 'ALCALDIA',
      'OBJETO', 'CONTRATAR', 'SUMINISTRO', 'MANTENIMIENTO', 'ADQUISICION', 'COMPRA', 'CONTRATO', 'INTERVENTORIA'
    ]);

    return text
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word));
  }

  private computeJaccardWithSets(setA: Set<string>, setB: Set<string>): number {
    let intersectionCount = 0;
    const smallerSet = setA.size < setB.size ? setA : setB;
    const largerSet = setA.size < setB.size ? setB : setA;

    for (const item of smallerSet) {
      if (largerSet.has(item)) {
        intersectionCount++;
      }
    }

    if (intersectionCount === 0) return 0;
    const unionSize = setA.size + setB.size - intersectionCount;
    return intersectionCount / unionSize;
  }

  private normalizeName(name: string): string {
    return name
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/g, ' ')
      .trim();
  }

  public calculateSimilarity(contratos: Contract[]): SimilarObjectGroup[] {
    if (!contratos || contratos.length === 0) {
      return [];
    }

    // 1. Group exact objects
    const exactGroups: { [key: string]: { originalObject: string; contracts: Contract[] } } = {};
    contratos.forEach((c: Contract) => {
      const obj = c.object?.trim();
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
        const words = this.getNormalizedWords(value.originalObject);
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

        const sim = this.computeJaccardWithSets(rep.wordSet, other.wordSet);
        if (sim >= 0.55) {
          visited[otherIdx] = 1;
          clusterMemberIndices.push(otherIdx);
        }
      }

      if (clusterMemberIndices.length >= 2) {
        const clusterMembers = clusterMemberIndices.map(i => items[i]);
        const allContracts = clusterMembers.flatMap(m => m.contracts);
        const totalValue = allContracts.reduce((acc, c) => acc + (c.contractValue || 0), 0);
        const uniqueObjects = Array.from(new Set(clusterMembers.map(m => m.originalObject)));

        const contractorsSet = new Set<string>();
        allContracts.forEach(c => {
          if (c.supplierId) {
            // Need the supplier name, but we only have ID here right now
            // Adjusting this based on the available data. If supplier relation is fetched, it should be used.
            contractorsSet.add(c.supplierId); // fallback
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
    return clusters;
  }
}
