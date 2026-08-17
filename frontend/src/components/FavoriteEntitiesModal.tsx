import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Search } from 'lucide-react';
import { getFavoriteEntities } from '../services/api';
import { EntidadResumen } from '../types';

interface FavoriteEntitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (entity: any) => void;
}

export const FavoriteEntitiesModal: React.FC<FavoriteEntitiesModalProps> = ({
  isOpen,
  onClose,
  onSelectEntity
}) => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchFavorites = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await getFavoriteEntities();
          setFavorites(data);
        } catch (err: any) {
          setError(err.message || 'Error al cargar entidades favoritas');
        }
        setLoading(false);
      };
      fetchFavorites();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-lg leading-tight font-sans">
                Mis Entidades Favoritas
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">Selecciona una entidad para consultar su contratación.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Search className="w-8 h-8 text-indigo-400 animate-pulse" />
              <p className="text-sm font-mono text-slate-500">Buscando tus entidades...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30 text-center">
              {error}
            </div>
          ) : favorites.length === 0 ? (
            <div className="py-10 text-center space-y-3 opacity-60">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-slate-700 dark:text-slate-300 font-semibold">No tienes entidades favoritas</h3>
              <p className="text-xs text-slate-500 max-w-[250px] mx-auto">Marca la estrella junto al nombre de una entidad para guardarla aquí.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {favorites.map((fav) => (
                <button
                  key={fav.entityCode}
                  onClick={() => {
                    // Reconstruct a partial EntidadResumen or fetch full details if needed
                    // For now, we set the basic info we have
                    onSelectEntity({
                      codigo_entidad: fav.entityCode,
                      nombre_entidad: fav.entityName,
                      departamento: '', // We don't have this in favorites DB, but it will work for the query
                      ciudad: '',
                    });
                    onClose();
                  }}
                  className="flex items-start text-left gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {fav.entityName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      Cód: {fav.entityCode}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
