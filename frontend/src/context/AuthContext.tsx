import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  // Add other user fields as necessary
}

interface AuthContextType {
  user: User | null;
  plan: string | null;
  maxFavoriteEntities: number | null;
  capabilities: string[];
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: null,
  maxFavoriteEntities: null,
  capabilities: [],
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
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
        setUser({ id: data.id, email: data.email, name: data.name });
        setPlan(data.plan || null);
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
    <AuthContext.Provider value={{ user, plan, maxFavoriteEntities, capabilities, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
