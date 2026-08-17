import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { getFavoriteEntities, addFavoriteEntity, removeFavoriteEntity } from '../services/api';
import { EntidadResumen } from '../types';

interface FavoriteEntityButtonProps {
  entity: EntidadResumen;
}

export const FavoriteEntityButton: React.FC<FavoriteEntityButtonProps> = ({ entity }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const favorites = await getFavoriteEntities();
        setIsFavorite(favorites.some((f: any) => f.entityCode === entity.codigo_entidad));
      } catch (err) {
        console.error('Error fetching favorite entities:', err);
      }
    };
    checkFavorite();
  }, [entity.codigo_entidad]);

  const toggleFavorite = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Debes iniciar sesión para agregar entidades favoritas.');
      return;
    }

    // Proactively check plan limit in frontend context for FREE plan
    const currentUserRaw = localStorage.getItem('user');
    if (currentUserRaw) {
      try {
        const currentUser = JSON.parse(currentUserRaw);
        if (currentUser.plan === 'FREE' || currentUser.plan?.name === 'FREE') {
           alert('Suscríbete a un plan de pago para usar la función de favoritos.');
           return;
        }
      } catch (e) {
        // Ignorar si hay un error parseando
      }
    }

    setLoading(true);
    try {
      if (isFavorite) {
        await removeFavoriteEntity(entity.codigo_entidad);
        setIsFavorite(false);
      } else {
        await addFavoriteEntity(entity.codigo_entidad, entity.nombre_entidad);
        setIsFavorite(true);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al actualizar favorita');
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
        isFavorite
          ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
          : 'text-slate-400 hover:text-yellow-500 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
    >
      <Star size={24} fill={isFavorite ? "currentColor" : "none"} strokeWidth={isFavorite ? 0 : 2} />
    </button>
  );
};
