import { useState, useEffect } from 'react';
import { fetchWikiSymbol, WikipediaSymbol, TerritorySymbols } from '../services/wikipediaService';

export function useWikipediaFlag(ciudad?: string, departamento?: string): TerritorySymbols {
  const [symbols, setSymbols] = useState<TerritorySymbols>({
    citySymbol: null,
    deptSymbol: null,
    loading: false,
    error: false,
  });

  useEffect(() => {
    if (!ciudad && !departamento) {
      setSymbols({ citySymbol: null, deptSymbol: null, loading: false, error: false });
      return;
    }

    let isMounted = true;
    setSymbols(prev => ({ ...prev, loading: true, error: false }));

    async function loadSymbols() {
      try {
        const [cityRes, deptRes] = await Promise.all([
          ciudad ? fetchWikiSymbol(ciudad, 'city') : Promise.resolve(null),
          departamento ? fetchWikiSymbol(departamento, 'department') : Promise.resolve(null),
        ]);

        if (isMounted) {
          setSymbols({
            citySymbol: cityRes,
            deptSymbol: deptRes,
            loading: false,
            error: false,
          });
        }
      } catch (err) {
        if (isMounted) {
          setSymbols(prev => ({ ...prev, loading: false, error: true }));
        }
      }
    }

    loadSymbols();

    return () => {
      isMounted = false;
    };
  }, [ciudad, departamento]);

  return symbols;
}
