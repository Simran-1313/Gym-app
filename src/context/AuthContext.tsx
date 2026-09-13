import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { getSecureItem, setSecureItem } from '../utils/secureStorage';
import { getCookie, clearCookie } from '../services/api';
import { getMe, login as apiLogin, logout as apiLogout, LoginPayload } from '../services/auth.service';
import { getDeviceTokenInfo } from '../services/deviceToken';
import { disconnectSocket } from '../services/socket';
import { cacheGym, getCachedGym, toGymBrand, GymBrand } from '../services/gymBrand';
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
  /**
   * The gym to brand the UI with. Live tenant while signed in, last-known gym
   * before that (so the login screen belongs to the member's gym, not to us),
   * null only on a device that has never signed in.
   */
  gym: GymBrand | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Persisted dark/light choice. Absent means "follow the device". */
const THEME_KEY = 'clasendra.theme';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isFirstLogin: false,
  });

  const [cachedGym, setCachedGym] = useState<GymBrand | null>(null);

  // Follow the device until the member picks a side, then remember the pick.
  // Hardcoding 'light' meant a phone in dark mode opened to a bright screen,
  // and the toggle used to reset on every launch because nothing persisted it.
  const systemScheme = useColorScheme();
  const [themeOverride, setThemeOverride] = useState<'dark' | 'light' | null>(null);
  const theme: 'dark' | 'light' = themeOverride ?? (systemScheme === 'light' ? 'light' : 'dark');

  useEffect(() => {
    getSecureItem(THEME_KEY)
      .then((v) => {
        if (v === 'dark' || v === 'light') setThemeOverride(v);
      })
      .catch(() => {});
  }, []);

  // Remember the gym so the *next* launch is branded from the first frame.
  const rememberGym = useCallback((user: User | null) => {
    const brand = toGymBrand(user?.tenant);
    if (!brand) return;
    setCachedGym(brand);
    cacheGym(user?.tenant);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeOverride(next);
    setSecureItem(THEME_KEY, next).catch(() => {});
  }, [theme]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await getMe();
      rememberGym(user);
      setState((s) => ({ ...s, user, isFirstLogin: user.isFirstLogin }));
    } catch {
      await clearCookie();
      setState((s) => ({ ...s, user: null, isFirstLogin: false }));
    }
  }, [rememberGym]);

  useEffect(() => {
    const bootstrap = async () => {
      // Paint the login screen with the last gym seen on this device rather than
      // with platform branding, before any network call happens.
      getCachedGym().then((brand) => brand && setCachedGym(brand));

      const cookie = await getCookie();
      // Web sessions live in the browser cookie jar (httpOnly), not localStorage.
      if (cookie || Platform.OS === 'web') {
        try {
          const user = await getMe();
          // Only auto-restore fully onboarded members. Everyone else must log in
          // first so the flow is always: Login → (change password) → onboarding.
          if (user.isOnboarded) {
            rememberGym(user);
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
  }, [rememberGym]);

  const login = useCallback(async (payload: LoginPayload) => {
    // Attach the native FCM/APNs device token + platform so the backend can register
    // it at login. Falls back to email/password only when no token is available.
    const tokenInfo = await getDeviceTokenInfo();
    const fullPayload: LoginPayload = tokenInfo
      ? { ...payload, deviceToken: tokenInfo.deviceToken, platform: tokenInfo.platform }
      : payload;

    const data = await apiLogin(fullPayload);
    rememberGym(data.user);
    setState((s) => ({ ...s, user: data.user, isFirstLogin: data.isFirstLogin }));
  }, [rememberGym]);

  const logout = useCallback(async () => {
    disconnectSocket();
    await apiLogout();
    setState({ user: null, isLoading: false, isFirstLogin: false });
  }, []);

  const setFirstLoginDone = useCallback(() => {
    setState((s) => ({ ...s, isFirstLogin: false }));
  }, []);

  // Live tenant wins over the cache — a member moved to another gym should see
  // the new branding the moment their session says so.
  const gym = toGymBrand(state.user?.tenant) ?? cachedGym;

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, refreshUser, setFirstLoginDone, gym, theme, toggleTheme }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
