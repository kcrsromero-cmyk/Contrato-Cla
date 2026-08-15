import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  planId?: string;
}

export interface AuthContextType {
  user: User | null;
  plan: string | null;
  capabilities: string[];
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await getMe();
          setUser(data.user || null);
          setPlan(data.plan || null);
          setCapabilities(data.capabilities || []);
        } catch (error) {
          console.error('Failed to fetch user data', error);
          // Optional: handle token clearing or silent fail
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, plan, capabilities, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
