import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, loadToken, saveToken, loadApiBase, loadUser, saveUser } from './api';
import { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await loadApiBase();
      const t = await loadToken();
      const u = await loadUser();
      if (t && u) {
        setUser(u);
        api.me().then((r: any) => { setUser(r.user); saveUser(r.user); }).catch(() => {});
      } else if (t) {
        api.me().then((r: any) => { setUser(r.user); saveUser(r.user); }).catch(() => { saveToken(null); });
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const r: any = await api.login(username, password);
    await saveToken(r.token);
    await saveUser(r.user);
    setUser(r.user);
  };

  const register = async (username: string, password: string) => {
    const r: any = await api.register(username, password);
    await saveToken(r.token);
    await saveUser(r.user);
    setUser(r.user);
  };

  const logout = async () => {
    try { await api.logout(); } catch (e) {}
    await saveToken(null);
    await saveUser(null);
    setUser(null);
  };

  const updateUser = (u: User) => { setUser(u); saveUser(u); };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
