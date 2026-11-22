import React, { useEffect, useState } from 'react';
import { Key, Copy, Check, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { listApiKeys, createApiKey, revokeApiKey, ApiKeySummary, IssuedApiKey } from '../services/api';

interface ApiKeysTabProps {
  capabilities: string[];
  /** Called with `true` while a freshly-created key is waiting to be copied, `false` once dismissed. */
  onRevealedChange?: (hasRevealed: boolean) => void;
}

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export default function ApiKeysTab({ capabilities, onRevealedChange }: ApiKeysTabProps) {
  const hasApiAccess = capabilities.includes('USE_API');

  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<IssuedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const refreshKeys = async () => {
    setLoading(true);
    setListError(null);
    try {
      const result = await listApiKeys();
      setKeys(result);
    } catch (err: any) {
      setListError(err.message || 'Error al obtener las claves de API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasApiAccess) {
      refreshKeys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiAccess]);

  useEffect(() => {
    onRevealedChange?.(!!revealedKey);
    // Also clears the parent's guard if this component unmounts while a key is still revealed.
    return () => onRevealedChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedKey]);

  if (!hasApiAccess) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Key className="w-4 h-4" /> Claves de API
        </h3>
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
            Disponible en el plan BUSINESS
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            Integra Contrata360 con tus propios sistemas: crea claves de API para consultar contratos y analítica de forma programática, sin iniciar sesión manualmente.
          </p>
        </div>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    setCreateError(null);
    try {
      const issued = await createApiKey(trimmed);
      setRevealedKey(issued);
      setNewName('');
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear la clave de API');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable; the user can still select and copy manually.
    }
  };

  const handleDismissRevealed = () => {
    setRevealedKey(null);
    setCopied(false);
    refreshKeys();
  };

  const handleRevoke = async (id: string) => {
    if (confirmingRevokeId !== id) {
      setConfirmingRevokeId(id);
      return;
    }

    setRevokingId(id);
    setRevokeError(null);
    try {
      await revokeApiKey(id);
      setConfirmingRevokeId(null);
      await refreshKeys();
    } catch (err: any) {
      setRevokeError(err.message || 'Error al revocar la clave de API');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Key className="w-4 h-4" /> Claves de API
      </h3>

      {revealedKey && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Copia esta clave ahora. No se volverá a mostrar.
            </p>
          </div>
          <div className="p-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg font-mono text-xs break-all select-all text-slate-900 dark:text-slate-100">
            {revealedKey.key}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={handleDismissRevealed}
              className="flex-1 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition-all"
            >
              Ya la copié
            </button>
          </div>
        </div>
      )}

      {createError && (
        <div className="p-3 rounded-xl text-xs font-semibold border bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {createError}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la clave (ej: Integración ERP)"
          className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={!newName.trim() || creating}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shrink-0"
        >
          {creating ? 'Creando...' : 'Crear clave'}
        </button>
      </form>

      {revokeError && (
        <div className="p-3 rounded-xl text-xs font-semibold border bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {revokeError}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {!loading && listError && (
        <div className="p-3 rounded-xl text-xs font-semibold border bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
          {listError}
        </div>
      )}

      {!loading && !listError && keys.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-2">Aún no tienes claves de API.</p>
      )}

      {!loading && !listError && keys.length > 0 && (
        <div className="space-y-2">
          {keys.map((k) => {
            const isRevoked = !!k.revokedAt;
            return (
              <div
                key={k.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{k.name}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{k.keyPrefix}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Creada: {formatDate(k.createdAt)} · Último uso: {formatDate(k.lastUsedAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isRevoked
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}
                  >
                    {isRevoked ? 'Revocada' : 'Activa'}
                  </span>
                  {!isRevoked && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={revokingId === k.id}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        confirmingRevokeId === k.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {revokingId === k.id ? '...' : confirmingRevokeId === k.id ? '¿Confirmar?' : 'Revocar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
