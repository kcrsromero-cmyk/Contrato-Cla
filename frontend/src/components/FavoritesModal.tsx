import React, { useState, useEffect } from 'react';
import { EntidadResumen, Contrato } from '../types';
import { X, Star, Trash2, ArrowRight, Heart, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { mapContractToViewModel } from '../utils/contractAdapter';
import {
  getFavoriteEntities,
  removeFavoriteEntity,
  getFavoriteContracts,
  removeFavoriteContract
} from '../services/api';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (entity: EntidadResumen) => void;
  defaultTab?: 'entities' | 'contracts';
  onViewContractDetail?: (contract: Contrato) => void;
}

export default function FavoritesModal({ isOpen, onClose, onSelectEntity, defaultTab = 'entities', onViewContractDetail }: FavoritesModalProps) {
  const { user, capabilities } = useAuth();
  const hasFavorites = capabilities.includes('USE_FAVORITES');
  const { removeFavoriteId } = useFavorites();

  const [activeTab, setActiveTab] = useState<'entities' | 'contracts'>(defaultTab);

  const [entities, setEntities] = useState<{ entityCode: string; entityName: string }[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [errorEntities, setErrorEntities] = useState<string | null>(null);

  const [contracts, setContracts] = useState<Contrato[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [errorContracts, setErrorContracts] = useState<string | null>(null);

  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    if (isOpen && user) {
      if (activeTab === 'entities') {
        loadFavoriteEntities();
      } else {
        loadFavoriteContracts();
      }
    }
  }, [isOpen, user, activeTab]);

  const loadFavoriteEntities = async () => {
    setLoadingEntities(true);
    setErrorEntities(null);
    try {
      const data = await getFavoriteEntities();
      setEntities(data);
    } catch (err: any) {
      setErrorEntities(err.message || 'Error de red');
    } finally {
      setLoadingEntities(false);
    }
  };

  const loadFavoriteContracts = async () => {
    setLoadingContracts(true);
    setErrorContracts(null);
    try {
      const data = await getFavoriteContracts();
      setContracts(data);
    } catch (err: any) {
      setErrorContracts(err.message || 'Error de red');
    } finally {
      setLoadingContracts(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    if (activeTab === 'entities') {
      try {
        await removeFavoriteEntity(confirmDelete);
        setEntities(entities.filter(e => e.entityCode !== confirmDelete));
      } catch (err) {
        // En un caso real podríamos mostrar un toast de error, pero para este componente
        // ya se nos pidió no usar alert ni confirm. Ignoraremos el error aquí o mostrarlo
        // en consola si ocurre.
        console.error('Error al eliminar entidad de favoritos');
      }
    } else {
      try {
        await removeFavoriteContract(confirmDelete);
        removeFavoriteId(confirmDelete);
        setContracts(contracts.filter(c => {
          const cid = c.id_contrato || (c as any).contractId;
          return cid !== confirmDelete;
        }));
      } catch (err) {
        console.error('Error al eliminar contrato de favoritos');
      }
    }
    setConfirmDelete(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110000] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up border border-slate-200 dark:border-slate-800">

        {confirmDelete && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-3xl">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                ¿Eliminar de favoritos?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 break-all">
                {confirmDelete}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header with Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-[5]">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Favoritos</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!hasFavorites && (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-5">
                <Star className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Funcionalidad exclusiva para suscriptores
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-6">
                Guarda entidades y contratos para acceder rápidamente a ellos. Disponible desde el plan Starter.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Ver planes
              </button>
            </div>
          )}

          {hasFavorites && (
          <div className="flex px-6 gap-6">
            <button
              onClick={() => setActiveTab('entities')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'entities'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-b-2 border-transparent'
              }`}
            >
              <Star className="w-4 h-4" />
              Entidades
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'contracts'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 border-b-2 border-transparent'
              }`}
            >
              <Heart className="w-4 h-4" />
              Contratos
            </button>
          </div>
          )}
        </div>

        {/* Content */}
        {hasFavorites && (
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">

          {activeTab === 'entities' && (
            <>
              {loadingEntities ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-mono text-sm">
                  Cargando tus entidades favoritas...
                </div>
              ) : errorEntities ? (
                <div className="py-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/50">
                  <p>{errorEntities}</p>
                  <button
                    onClick={loadFavoriteEntities}
                    className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold cursor-pointer"
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
                          onClick={() => setConfirmDelete(entity.entityCode)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all cursor-pointer"
                          title="Eliminar de favoritos"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
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
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Ver Datos</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'contracts' && (
            <>
              {loadingContracts ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 animate-pulse font-mono text-sm">
                  Cargando tus contratos favoritos...
                </div>
              ) : errorContracts ? (
                <div className="py-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/50">
                  <p>{errorContracts}</p>
                  <button
                    onClick={loadFavoriteContracts}
                    className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              ) : contracts.length === 0 ? (
                <div className="py-16 text-center">
                  <Heart className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Sin contratos favoritos</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                    No tienes contratos guardados aún.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map(contract => {
                    const cid = contract.id_contrato || (contract as any).contractId;
                    const isExpanded = expandedContractId === cid;
                    const urlProcesoObj = contract.urlproceso || (contract as any).url_proceso;
                    const url = typeof urlProcesoObj === 'string' ? urlProcesoObj : urlProcesoObj?.url;

                    return (
                      <div key={cid} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                        <div className="p-4 flex items-center justify-between">
                          <div className="min-w-0 flex-1 pr-4">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1" title={contract.objeto_del_contrato || (contract as any).object}>
                              {contract.objeto_del_contrato || (contract as any).object}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 truncate">
                              ID: {cid}
                            </p>
                            <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1">Valor: $ {(contract.valor_del_contrato || (contract as any).contractValue || 0).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setConfirmDelete(cid)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all cursor-pointer"
                              title="Eliminar de favoritos"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (onViewContractDetail) {
                                  onViewContractDetail(mapContractToViewModel(contract));
                                  onClose();
                                }
                              }}
                              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Ver detalle</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
        )}
      </div>
    </div>
  );
}
