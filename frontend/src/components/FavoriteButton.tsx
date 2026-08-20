import React, { useState } from 'react';
import { Contrato } from '../types';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { addFavoriteContract } from '../services/api';

export const FavoriteButton: React.FC<{ contract: Contrato }> = ({ contract }) => {
  const { capabilities } = useAuth();
  const hasFavorites = capabilities.includes('USE_FAVORITES');
  const { favoriteContractIds, addFavoriteId } = useFavorites();
  const isFavorited = favoriteContractIds.has(contract.id_contrato);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!hasFavorites || loading || isFavorited) return;
    setLoading(true);
    try {
      await addFavoriteContract(contract.id_contrato);
      addFavoriteId(contract.id_contrato);
    } catch {
      // silencioso — no window.alert
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={hasFavorites ? (isFavorited ? 'En favoritos' : 'Añadir a favoritos') : 'Disponible desde el plan Starter'}
      className={`p-2 transition-colors rounded-xl ${
        !hasFavorites
          ? 'text-slate-300 dark:text-slate-700 cursor-default'
          : isFavorited
          ? 'text-amber-400'
          : 'text-slate-400 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
      }`}
    >
      <Star size={18} className={isFavorited ? 'fill-current' : ''} />
    </button>
  );
};
