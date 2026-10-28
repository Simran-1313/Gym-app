import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { getSecureItem, setSecureItem } from '../utils/secureStorage';
import { getCookie, clearCookie, setUnauthorizedHandler } from '../services/api';
import { onReconnect } from '../services/network';
import { kindOf } from '../utils/requestPolicy';
import { getMe, login as apiLogin, logout as apiLogout, LoginPayload } from '../services/auth.service';
import { getDeviceTokenInfo } from '../services/deviceToken';
import { disconnectSocket } from '../services/socket';
import { cacheGym, getCachedGym, toGymBrand, GymBrand } from '../services/gymBrand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isFirstLogin: boolean;
  /**
   * Set when a saved session exists but couldn't be checked (offline, server
   * down). The cookie is kept, so `retryRestore` can pick the session back up
   * instead of forcing a fresh login.
   */
  restoreError: string | null;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Never throws. Only a 401 ends the session; network errors keep the current user. */
  refreshUser: () => Promise<void>;
  /** Server confirmed the fitness profile saved — enter the app even if `/me` can't be re-read right now. */
  markOnboarded: () => void;
  retryRestore: () => Promise<void>;
  abandonRestore: () => Promise<void>;
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
    restoreError: null,
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

  const endSession = useCallback(async () => {
    disconnectSocket();
    await clearCookie();
    setState({ user: null, isLoading: false, isFirstLogin: false, restoreError: null });
  }, []);

  // Any 401 outside login means the cookie is dead: go back to the login
  // screen through the normal flow. Onboarding drafts survive this (they're
  // stored per member), so nothing typed is lost.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      endSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  const refreshUser = useCallback(async () => {
    try {
      const user = await getMe();
      rememberGym(user);
      setState((s) => ({ ...s, user, isFirstLogin: user.isFirstLogin }));
    } catch (err) {
      // Used to clear the cookie on *any* failure, so a dropped connection
      // logged the member out. Keep the session unless the server rejected it.
      if (kindOf(err) === 'unauthorized') await endSession();
    }
  }, [rememberGym, endSession]);

  const markOnboarded = useCallback(() => {
    setState((s) => (s.user ? { ...s, user: { ...s.user, isOnboarded: true } } : s));
  }, []);

  const restoreSession = useCallback(async () => {
    const cookie = await getCookie();
    // Web sessions live in the browser cookie jar (httpOnly), not localStorage.
    if (!cookie && Platform.OS !== 'web') {
      setState((s) => ({ ...s, isLoading: false, restoreError: null }));
      return;
    }
    try {
      const user = await getMe();
      // Only auto-restore fully onboarded members. Everyone else must log in
      // first so the flow is always: Login → (change password) → onboarding.
      // Their onboarding answers are kept as a local draft, so this costs a
      // sign-in, not the form.
      if (user.isOnboarded) {
        rememberGym(user);
        setState((s) => ({ ...s, user, isFirstLogin: user.isFirstLogin, isLoading: false, restoreError: null }));
      } else {
        await clearCookie();
        setState((s) => ({ ...s, isLoading: false, restoreError: null }));
      }
    } catch (err) {
      const kind = kindOf(err);
      if (kind === 'unauthorized' || kind === 'not_found' || kind === null) {
        await clearCookie();
        setState((s) => ({ ...s, isLoading: false, restoreError: null }));
        return;
      }
      // Offline / unreachable / timeout / 5xx: the session may be perfectly
      // valid. Keep the cookie and offer a retry instead of the login form.
      setState((s) => ({
        ...s,
        isLoading: false,
        restoreError: err instanceof Error ? err.message : 'Couldn’t reach the server.',
      }));
    }
  }, [rememberGym]);

  useEffect(() => {
    // Paint the login screen with the last gym seen on this device rather than
    // with platform branding, before any network call happens.
    getCachedGym().then((brand) => brand && setCachedGym(brand));
    restoreSession();
  }, [restoreSession]);

  const retryRestore = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, restoreError: null }));
    await restoreSession();
  }, [restoreSession]);

  // Pick a pending restore back up by itself once the connection returns.
  const restorePending = !!state.restoreError && !state.user;
  useEffect(() => {
    if (!restorePending) return;
    return onReconnect(() => {
      retryRestore();
    });
  }, [restorePending, retryRestore]);

  /** Drop a pending restore and show the login form instead. */
  const abandonRestore = useCallback(async () => {
    await clearCookie();
    setState((s) => ({ ...s, restoreError: null }));
  }, []);

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
    try {
      await apiLogout();
    } finally {
      // Offline logout still signs out locally; apiLogout already cleared the cookie.
      setState({ user: null, isLoading: false, isFirstLogin: false, restoreError: null });
    }
  }, []);

  const setFirstLoginDone = useCallback(() => {
    setState((s) => ({ ...s, isFirstLogin: false }));
  }, []);

  // Live tenant wins over the cache — a member moved to another gym should see
  // the new branding the moment their session says so.
  const gym = toGymBrand(state.user?.tenant) ?? cachedGym;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
        markOnboarded,
        retryRestore,
        abandonRestore,
        setFirstLoginDone,
        gym,
        theme,
        toggleTheme,
      }}
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
