import React, { useState, useEffect } from 'react';
import { Contrato } from '../types';
import { X, Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFavoriteContracts, removeFavoriteContract } from '../services/api';

interface FavoriteContractsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FavoriteContractsModal({ isOpen, onClose }: FavoriteContractsModalProps) {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadFavoriteContracts();
    }
  }, [isOpen, user]);

  const loadFavoriteContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFavoriteContracts();
      setContracts(data);
    } catch (err: any) {
      setError(err.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (contractId: string) => {
    if (window.confirm("¿Estás seguro de eliminar este contrato de tus favoritos?")) {
      try {
        await removeFavoriteContract(contractId);
        setContracts(contracts.filter(c => c.id_contrato !== contractId && (c as any).contractId !== contractId));
      } catch (err) {
        alert('Error al eliminar el contrato de favoritos');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110000] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up border border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contratos Favoritos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Mis contratos guardados ({contracts.length})
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
              Cargando tus contratos favoritos...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/50">
              <p>{error}</p>
              <button
                onClick={loadFavoriteContracts}
                className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold"
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
                return (
                  <div key={cid} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                    <div className="min-w-0 flex-1 pr-4">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white" title={contract.objeto_del_contrato || (contract as any).object}>
                        {contract.objeto_del_contrato || (contract as any).object}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                        ID: {cid}
                      </p>
                      <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-1">Valor: $ {(contract.valor_del_contrato || (contract as any).contractValue || 0).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => removeFavorite(cid)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        title="Eliminar de favoritos"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
