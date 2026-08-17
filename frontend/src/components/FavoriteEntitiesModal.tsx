import React, { useState, useEffect } from 'react';
import { EntidadResumen } from '../types';
import { X, Star, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FavoriteEntitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (entity: EntidadResumen) => void;
}

export default function FavoriteEntitiesModal({ isOpen, onClose, onSelectEntity }: FavoriteEntitiesModalProps) {
  const { user } = useAuth();
  const [entities, setEntities] = useState<{ entityCode: string; entityName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadFavoriteEntities();
    }
  }, [isOpen, user]);

  const loadFavoriteEntities = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/procurement/favorite-entities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Error al cargar entidades favoritas');
      }
      const data = await res.json();
      setEntities(data);
    } catch (err: any) {
      setError(err.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (entityCode: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/procurement/favorite-entities?entityCode=${entityCode}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setEntities(entities.filter(e => e.entityCode !== entityCode));
      } else {
        alert('Error al eliminar entidad de favoritos');
      }
    } catch (err) {
      alert('Error de red');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up border border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Entidades Favoritas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Mis entidades guardadas ({entities.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
          {loading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-mono text-sm">
              Cargando tus entidades favoritas...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/50">
              <p>{error}</p>
              <button
                onClick={loadFavoriteEntities}
                className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold"
              >
                Reintentar
              </button>
            </div>
          ) : entities.length === 0 ? (
            <div className="py-16 text-center">
              <Star className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Sin entidades favoritas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                No tienes entidades guardadas. Busca una entidad y haz clic en la estrella para guardarla y acceder rápidamente a ella en el futuro.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entities.map(entity => (
                <div key={entity.entityCode} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                  <div className="min-w-0 flex-1 pr-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={entity.entityName}>
                      {entity.entityName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                      Código: {entity.entityCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => removeFavorite(entity.entityCode)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      title="Eliminar de favoritos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        // Create a partial EntidadResumen to navigate.
                        // The user will load the dashboard with it.
                        onSelectEntity({
                          codigo_entidad: entity.entityCode,
                          nombre_entidad: entity.entityName,
                          nit_entidad: '',
                          departamento: '',
                          ciudad: '',
                          orden: ''
                        });
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Ver Datos</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
