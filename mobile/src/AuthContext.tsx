import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, loadToken, saveToken, loadApiBase } from './api';
import { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await loadApiBase();
      const t = await loadToken();
      if (t) {
        try {
          const r: any = await api.me();
          setUser(r.user);
        } catch (e) {
          await saveToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const r: any = await api.login(username, password);
    await saveToken(r.token);
    setUser(r.user);
  };

  const register = async (username: string, password: string) => {
    const r: any = await api.register(username, password);
    await saveToken(r.token);
    setUser(r.user);
  };

  const logout = async () => {
    try { await api.logout(); } catch (e) {}
    await saveToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
