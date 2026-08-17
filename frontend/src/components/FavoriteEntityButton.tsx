import React, { useState, useEffect } from 'react';
import { EntidadResumen } from '../types';
import { Star } from 'lucide-react';
import { getFavoriteEntities, addFavoriteEntity, removeFavoriteEntity } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface FavoriteEntityButtonProps {
  entity: EntidadResumen;
}

export const FavoriteEntityButton: React.FC<FavoriteEntityButtonProps> = ({ entity }) => {
  const { user, plan } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const isFreePlan = plan === 'FREE';

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const entities = await getFavoriteEntities();
        if (entities.some((e: any) => e.entityCode === entity.codigo_entidad)) {
          setIsFavorite(true);
        }
      } catch (err) {
        console.error('Error checking favorite status', err);
      }
    };
    checkFavorite();
  }, [entity.codigo_entidad, user]);

  const showNotification = (type: 'error' | 'success', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleFavoriteEntity = async () => {
    if (isFreePlan) return; // Prevent action if on free plan

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('error', 'Debes iniciar sesión para agregar entidades favoritas.');
        setLoading(false);
        return;
      }

      if (isFavorite) {
        await removeFavoriteEntity(entity.codigo_entidad);
        setIsFavorite(false);
        showNotification('success', 'Entidad eliminada de favoritos');
      } else {
        await addFavoriteEntity({
          entityCode: entity.codigo_entidad,
          entityName: entity.nombre_entidad
        });
        setIsFavorite(true);
        showNotification('success', 'Entidad añadida a favoritos');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'Error de red al conectar con el servidor.');
    }
    setLoading(false);
  };

  const buttonTitle = isFreePlan
    ? "Disponible desde el plan Starter"
    : isFavorite
      ? "Eliminar de favoritos"
      : "Añadir Entidad a Favoritos";

  return (
    <div className="relative inline-block" title={buttonTitle}>
      <button
        onClick={handleToggleFavoriteEntity}
        disabled={loading || isFreePlan}
        className={`p-1.5 transition-colors ${loading || isFreePlan ? 'opacity-50' : ''} ${isFavorite ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-amber-500'} ${isFreePlan ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
      </button>

      {notification && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs z-50 animate-fade-in pointer-events-none">
          <div className={`px-3 py-2 rounded-xl border shadow-lg text-xs font-semibold ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400'
          }`}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
};
