import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'SECURITY' | 'ADMIN';
  phone?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('safecampus_token');
    const savedUser = localStorage.getItem('safecampus_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, role?: string) => {
    const response = await authAPI.login({ email, password, role });
    const { user: userData, token: authToken } = response.data.data;

    setUser(userData);
    setToken(authToken);
    localStorage.setItem('safecampus_token', authToken);
    localStorage.setItem('safecampus_user', JSON.stringify(userData));
  }, []);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    const response = await authAPI.register(data);
    const { user: userData, token: authToken } = response.data.data;

    setUser(userData);
    setToken(authToken);
    localStorage.setItem('safecampus_token', authToken);
    localStorage.setItem('safecampus_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('safecampus_token');
    localStorage.removeItem('safecampus_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
