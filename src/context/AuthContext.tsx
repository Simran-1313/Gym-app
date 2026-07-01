import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getCookie, clearCookie } from '../services/api';
import { getMe, login as apiLogin, logout as apiLogout, LoginPayload } from '../services/auth.service';
import { getDeviceTokenInfo } from '../services/deviceToken';
import { disconnectSocket } from '../services/socket';
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
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isFirstLogin: false,
  });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

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
      // Web sessions live in the browser cookie jar (httpOnly), not localStorage.
      if (cookie || Platform.OS === 'web') {
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
    console.log('[AuthContext] login function started with payload email:', payload.email);

    // Attach the native FCM/APNs device token + platform so the backend can register
    // it at login. Falls back to email/password only when no token is available.
    const tokenInfo = await getDeviceTokenInfo();
    const fullPayload: LoginPayload = tokenInfo
      ? { ...payload, deviceToken: tokenInfo.deviceToken, platform: tokenInfo.platform }
      : payload;
    console.log('[AuthContext] device token attached to login payload:', !!tokenInfo);

    const data = await apiLogin(fullPayload);
    console.log('[AuthContext] apiLogin completed. Response data:', data);
    setState((s) => ({ ...s, user: data.user, isFirstLogin: data.isFirstLogin }));
    console.log('[AuthContext] AuthState updated. User ID:', data.user ? data.user.id : null, 'isFirstLogin:', data.isFirstLogin);
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    await apiLogout();
    setState({ user: null, isLoading: false, isFirstLogin: false });
  }, []);

  const setFirstLoginDone = useCallback(() => {
    setState((s) => ({ ...s, isFirstLogin: false }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, setFirstLoginDone, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
