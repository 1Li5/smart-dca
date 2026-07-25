import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../lib/auth';
import type { User } from '../lib/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (input: { username: string; password: string }) => Promise<User>;
  register: (input: { username: string; password: string; inviteCode: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider：维护登录态、暴露登录/注册/登出方法
 * 挂载时调 /api/auth/me 自动恢复（cookie 在）
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const u = await authApi.fetchMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(async (input: { username: string; password: string }) => {
    const res = await authApi.login(input);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: { username: string; password: string; inviteCode: string }) => {
    const res = await authApi.register(input);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* 忽略：清 cookie 是 best-effort */ }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, loading, login, register, logout, refresh }), [user, loading, login, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
