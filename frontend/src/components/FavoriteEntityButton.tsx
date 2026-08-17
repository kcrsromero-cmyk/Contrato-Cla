import React, { useState } from 'react';
import { EntidadResumen } from '../types';
import { Star } from 'lucide-react';

interface FavoriteEntityButtonProps {
  entity: EntidadResumen;
}

export const FavoriteEntityButton: React.FC<FavoriteEntityButtonProps> = ({ entity }) => {
  const [loading, setLoading] = useState(false);

  const handleAddFavoriteEntity = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Debes iniciar sesión para agregar entidades favoritas.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/procurement/favorite-entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entityCode: entity.codigo_entidad,
          entityName: entity.nombre_entidad
        })
      });

      if (!res.ok) {
        if (res.status === 403) {
          const errorData = await res.json().catch(() => null);
          alert(errorData?.error || 'Tu plan actual o límite no permite agregar más entidades favoritas.');
        } else {
          alert('Error al agregar entidad favorita');
        }
      } else {
        alert('Entidad añadida a favoritos');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al conectar con el servidor.');
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleAddFavoriteEntity}
      disabled={loading}
      className={`p-1.5 text-slate-400 hover:text-amber-500 transition-colors ${loading ? 'opacity-50' : ''}`}
      title="Añadir Entidad a Favoritos"
    >
      <Star className="w-5 h-5" />
    </button>
  );
};
