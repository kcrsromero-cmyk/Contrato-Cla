import React, { useState } from 'react';
import { X, User, Lock, Mail, Star, Shield, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { updateProfile } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileModal({ isOpen, onClose, onLogout }: ProfileModalProps) {
  const { user, plan, capabilities } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: (user as any)?.phone || '',
    telegramUsername: (user as any)?.telegramUsername || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{type:'success'|'error', text:string}|null>(null);

  if (!isOpen) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay sesión activa para actualizar la contraseña');
      }

      const refreshToken = localStorage.getItem('refreshToken') || '';

      // Configure session explicitly before updating
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
      setNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al actualizar contraseña' });
    } finally {
      setLoading(false);
    }
  };

  const getCapabilityLabel = (cap: string) => {
    switch (cap) {
      case 'USE_FAVORITES': return 'Uso de Favoritos';
      case 'VIEW_SIMILARITY_ANALYSIS': return 'Análisis de Similitud';
      default: return cap.replace(/_/g, ' ').toLowerCase();
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
            Perfil de Usuario
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            {user?.name || 'Usuario'}
          </p>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Datos Personales */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Datos personales
            </h3>

            {profileMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold border ${
                profileMessage.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setProfileLoading(true);
              setProfileMessage(null);
              try {
                await updateProfile(profileData);
                setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
              } catch (err: any) {
                setProfileMessage({ type: 'error', text: err.message || 'Error al actualizar perfil' });
              } finally {
                setProfileLoading(false);
              }
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  placeholder="Ej: +57 300 000 0000"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                  Usuario de Telegram
                </label>
                <input
                  type="text"
                  value={profileData.telegramUsername}
                  onChange={(e) => setProfileData({...profileData, telegramUsername: e.target.value})}
                  placeholder="Ej: miusuario (sin @)"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                  Próximamente recibirás alertas de contratos en Telegram
                </p>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold text-sm transition-all"
              >
                {profileLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Info Sections */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4" /> Cuenta
            </h3>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Actual</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{plan || 'Básico'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-500 mt-1" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Capacidades</p>
                <div className="flex flex-wrap gap-2">
                  {capabilities?.length ? capabilities.map(cap => (
                    <span key={cap} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
                      {getCapabilityLabel(cap)}
                    </span>
                  )) : (
                    <span className="text-sm text-slate-500">Ninguna</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Change Password Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4" /> Cambiar Contraseña
            </h3>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-semibold border ${
                message.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>


        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              localStorage.removeItem('refreshToken');
              onLogout();
              onClose();
            }}
            className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            Cerrar Sesión General
          </button>
        </div>
      </div>
    </div>
  );
}
