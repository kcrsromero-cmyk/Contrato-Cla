import React, { useState } from 'react';
import { Contrato } from '../types';
import { Heart } from 'lucide-react';

export const FavoriteButton: React.FC<{ contract: Contrato }> = ({ contract }) => {
  const [loading, setLoading] = useState(false);

  const handleAddFavorite = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Debes iniciar sesión para agregar favoritos.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/procurement/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractId: contract.id_contrato,
          contractData: {
            objeto_del_contrato: contract.objeto_del_contrato,
            nombre_entidad: contract.nombre_entidad,
            codigo_entidad: contract.codigo_entidad,
            department: contract.departamento,
            city: contract.ciudad,
            contractValue: contract.valor_del_contrato
          }
        })
      });

      if (!res.ok) {
        if (res.status === 403) {
          alert('Tu plan actual no incluye la capacidad de usar Favoritos.');
        } else {
          alert('Error al agregar favorito');
        }
      } else {
        alert('Añadido a favoritos');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red');
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleAddFavorite}
      disabled={loading}
      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
      title="Añadir a Favoritos"
    >
      <Heart size={20} />
    </button>
  );
};
