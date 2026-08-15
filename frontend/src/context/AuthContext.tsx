import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  // Add other user fields as necessary
}

interface Plan {
  id: string;
  name: string;
  // Add other plan fields as necessary
}

interface AuthContextType {
  user: User | null;
  plan: Plan | null;
  capabilities: string[];
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  plan: null,
  capabilities: [],
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
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
        if (data.user) {
          setUser(data.user);
          setPlan(data.plan || null);
          setCapabilities(data.capabilities || []);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, plan, capabilities, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
