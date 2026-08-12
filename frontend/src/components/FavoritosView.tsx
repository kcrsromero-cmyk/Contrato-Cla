import React, { useEffect, useState } from 'react';
import { Contrato } from '../types';

export const FavoritosView: React.FC = () => {
  const [favorites, setFavorites] = useState<Contrato[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Debes iniciar sesión para ver tus favoritos.');
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/procurement/favorites`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
           if (res.status === 403) {
              throw new Error('Tu plan actual no incluye la capacidad de usar Favoritos.');
           }
           throw new Error('Error al cargar favoritos');
        }
        const data = await res.json();
        setFavorites(data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchFavorites();
  }, []);

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Mis Contratos Favoritos</h2>
      {favorites.length === 0 ? (
        <p>No tienes contratos favoritos aún.</p>
      ) : (
        <ul className="space-y-4">
          {favorites.map((contract) => (
            <li key={contract.id_contrato} className="bg-white p-4 shadow rounded border">
              <h3 className="font-semibold">{contract.objeto_del_contrato || (contract as any).object}</h3>
              <p className="text-sm text-gray-600">ID: {contract.id_contrato || (contract as any).contractId}</p>
              <p className="text-sm text-gray-600">Valor: $ {(contract.valor_del_contrato || (contract as any).contractValue || 0).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
