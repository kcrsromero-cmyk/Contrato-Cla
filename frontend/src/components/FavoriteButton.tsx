import React, { useState } from 'react';
import { Contrato } from '../types';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addFavoriteContract } from '../services/api';

export const FavoriteButton: React.FC<{ contract: Contrato }> = ({ contract }) => {
  const { capabilities } = useAuth();
  const hasFavorites = capabilities.includes('USE_FAVORITES');
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!hasFavorites || loading || isFavorited) return;
    setLoading(true);
    try {
      await addFavoriteContract(contract.id_contrato);
      setIsFavorited(true);
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
          ? 'text-red-500'
          : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
      }`}
    >
      <Heart size={18} className={isFavorited ? 'fill-current' : ''} />
    </button>
  );
};
