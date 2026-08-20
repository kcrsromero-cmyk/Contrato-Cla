import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Star, Shield, Edit3, MessageSquare, Phone, Bell } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState<'plan' | 'perfil' | 'notificaciones'>('plan');

  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: (user as any)?.phone || '',
    telegramUsername: (user as any)?.telegramUsername || '',
    notifyEmail: (user as any)?.notifyEmail || false,
    notifyTelegram: (user as any)?.notifyTelegram || false,
    notifySms: (user as any)?.notifySms || false,
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{type:'success'|'error', text:string}|null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setProfileData({
        name: user.name || '',
        phone: (user as any).phone || '',
        telegramUsername: (user as any).telegramUsername || '',
        notifyEmail: (user as any).notifyEmail || false,
        notifyTelegram: (user as any).notifyTelegram || false,
        notifySms: (user as any).notifySms || false,
      });
      setActiveTab('plan');
      setMessage(null);
      setProfileMessage(null);
      setNewPassword('');
    }
  }, [isOpen, user]);

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
        throw new Error('No estás autenticado o la sesión expiró');
      }

      const refreshToken = localStorage.getItem('refreshToken');
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken || ''
      });

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Contraseña actualizada con éxito' });
      setNewPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al actualizar contraseña' });
    } finally {
      setLoading(false);
    }
  };

  const getCapabilityLabel = (cap: string) => {
    const labels: Record<string, string> = {
      'USE_FAVORITES': 'Favoritos',
      'EXPORT_EXCEL': 'Exportar Excel',
      'VIEW_SIMILARITY': 'Análisis Similitud',
      'NOTIFICATIONS': 'Alertas'
    };
    return labels[cap] || cap;
  };

  const notificationChannels = [
    {
      key: 'notifyEmail' as const,
      label: 'Correo electrónico',
      description: 'Alertas de contratos a tu email',
      requiredPlan: 'FREE',
      icon: Mail,
      requiresUsername: false,
      requiresPhone: false,
    },
    {
      key: 'notifyTelegram' as const,
      label: 'Telegram',
      description: 'Mensajes directos vía bot de Telegram',
      requiredPlan: 'STARTER',
      icon: MessageSquare,
      requiresUsername: true,
    },
    {
      key: 'notifySms' as const,
      label: 'SMS',
      description: 'Mensajes de texto al teléfono registrado',
      requiredPlan: 'PROFESIONAL',
      icon: Phone,
      requiresPhone: true,
    },
  ];

  const planTiers = ['FREE', 'STARTER', 'PROFESIONAL', 'ENTERPRISE'];
  const userPlanIndex = planTiers.indexOf((plan || 'FREE').toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-up flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center">
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

        {/* Tabs */}
        <div className="flex px-4 pt-2 gap-2 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'plan'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Mi Plan
          </button>
          <button
            onClick={() => setActiveTab('perfil')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'perfil'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Mi Perfil
          </button>
          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'notificaciones'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Notificaciones
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">

          {activeTab === 'plan' && (
            <div className="space-y-4 animate-fade-in">
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
          )}

          {activeTab === 'perfil' && (
            <div className="space-y-6 animate-fade-in">
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
                    await updateProfile({
                      name: profileData.name,
                      phone: profileData.phone
                    });
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
          )}

          {activeTab === 'notificaciones' && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Canales de Alertas
                </h3>

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
                </div>

                <div className="space-y-3 pt-2">
                  {notificationChannels.map(channel => {
                    const Icon = channel.icon;
                    const reqPlanIndex = planTiers.indexOf(channel.requiredPlan);
                    const isAvailable = userPlanIndex >= reqPlanIndex;

                    let isDisabled = !isAvailable;
                    if (channel.requiresUsername && !profileData.telegramUsername) isDisabled = true;
                    if (channel.requiresPhone && !profileData.phone) isDisabled = true;

                    return (
                      <div key={channel.key} className={`flex items-center justify-between p-3 rounded-xl border ${isAvailable ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900' : 'border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isAvailable ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isAvailable ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                              {channel.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{channel.description}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {!isAvailable && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              Plan {channel.requiredPlan}
                            </span>
                          )}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              disabled={isDisabled}
                              checked={profileData[channel.key]}
                              onChange={(e) => setProfileData({...profileData, [channel.key]: e.target.checked})}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {profileMessage && activeTab === 'notificaciones' && (
                  <div className={`p-3 rounded-xl text-xs font-semibold border ${
                    profileMessage.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
                  }`}>
                    {profileMessage.text}
                  </div>
                )}

                <button
                  onClick={async () => {
                    setProfileLoading(true);
                    setProfileMessage(null);
                    try {
                      await updateProfile({
                        telegramUsername: profileData.telegramUsername,
                        notifyEmail: profileData.notifyEmail,
                        notifyTelegram: profileData.notifyTelegram,
                        notifySms: profileData.notifySms
                      });
                      setProfileMessage({ type: 'success', text: 'Preferencias actualizadas' });
                    } catch (err: any) {
                      setProfileMessage({ type: 'error', text: err.message || 'Error al actualizar preferencias' });
                    } finally {
                      setProfileLoading(false);
                    }
                  }}
                  disabled={profileLoading}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold text-sm transition-all"
                >
                  {profileLoading ? 'Guardando...' : 'Guardar preferencias'}
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 mt-auto shrink-0">
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
