import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getFavoriteContracts, getFavoriteEntities } from '../services/api';

interface FavoritesContextType {
  favoriteContractIds: Set<string>;
  addFavoriteId: (id: string) => void;
  removeFavoriteId: (id: string) => void;
  refreshContracts: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favoriteContractIds: new Set(),
  addFavoriteId: () => {},
  removeFavoriteId: () => {},
  refreshContracts: async () => {},
});

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, capabilities } = useAuth();
  const hasFavorites = capabilities.includes('USE_FAVORITES');
  const [favoriteContractIds, setFavoriteContractIds] = useState<Set<string>>(new Set());

  const refreshContracts = async () => {
    if (!user || !hasFavorites) return;
    try {
      const contracts = await getFavoriteContracts();
      setFavoriteContractIds(new Set(contracts.map((c: any) => c.contractId || c.id_contrato)));
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    refreshContracts();
  }, [user, hasFavorites]);

  const addFavoriteId = (id: string) =>
    setFavoriteContractIds(prev => new Set([...prev, id]));

  const removeFavoriteId = (id: string) =>
    setFavoriteContractIds(prev => { const s = new Set(prev); s.delete(id); return s; });

  return (
    <FavoritesContext.Provider value={{ favoriteContractIds, addFavoriteId, removeFavoriteId, refreshContracts }}>
      {children}
    </FavoritesContext.Provider>
  );
};
