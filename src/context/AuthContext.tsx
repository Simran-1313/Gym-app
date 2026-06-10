import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCookie, clearCookie } from '../services/api';
import { getMe, login as apiLogin, logout as apiLogout, LoginPayload } from '../services/auth.service';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isFirstLogin: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setFirstLoginDone: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isFirstLogin: false,
  });

  const refreshUser = useCallback(async () => {
    try {
      const user = await getMe();
      setState((s) => ({ ...s, user, isFirstLogin: user.isFirstLogin }));
    } catch {
      await clearCookie();
      setState((s) => ({ ...s, user: null, isFirstLogin: false }));
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const cookie = await getCookie();
      if (cookie) {
        try {
          const user = await getMe();
          // Only auto-restore fully onboarded members. Everyone else must log in
          // first so the flow is always: Login → (change password) → onboarding.
          if (user.isOnboarded) {
            setState((s) => ({
              ...s,
              user,
              isFirstLogin: user.isFirstLogin,
            }));
          } else {
            await clearCookie();
          }
        } catch {
          await clearCookie();
        }
      }
      setState((s) => ({ ...s, isLoading: false }));
    };
    bootstrap();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await apiLogin(payload);
    setState((s) => ({ ...s, user: data.user, isFirstLogin: data.isFirstLogin }));
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setState({ user: null, isLoading: false, isFirstLogin: false });
  }, []);

  const setFirstLoginDone = useCallback(() => {
    setState((s) => ({ ...s, isFirstLogin: false }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, setFirstLoginDone }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
