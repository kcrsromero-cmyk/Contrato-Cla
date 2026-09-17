import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  telegramUsername?: string;
  notifyEmail?: boolean;
  notifyTelegram?: boolean;
  notifySms?: boolean;
  // Add other user fields as necessary
}

interface AuthContextType {
  user: User | null;
  plan: string | null;
  planExpiresAt: string | null;
  maxFavoriteEntities: number | null;
  capabilities: string[];
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: null,
  planExpiresAt: null,
  maxFavoriteEntities: null,
  capabilities: [],
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [maxFavoriteEntities, setMaxFavoriteEntities] = useState<number | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getMe();
        setUser({
          id: data.id,
          email: data.email,
          name: data.name,
          phone: data.phone,
          telegramUsername: data.telegramUsername,
          notifyEmail: data.notifyEmail,
          notifyTelegram: data.notifyTelegram,
          notifySms: data.notifySms
        });
        setPlan(data.plan || null);
        setPlanExpiresAt(data.planExpiresAt || null);
        setMaxFavoriteEntities(data.maxFavoriteEntities ?? null);
        setCapabilities(data.capabilities || []);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, plan, planExpiresAt, maxFavoriteEntities, capabilities, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
