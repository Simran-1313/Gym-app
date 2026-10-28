import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';
import { ApiError, classifyFailure, failureMessage } from '../utils/requestPolicy';
import { getConnectivity } from './network';

const isWeb = Platform.OS === 'web';

const COOKIE_KEY = 'member_token_cookie';

export const storeCookie = async (cookieValue: string): Promise<void> => {
  await setSecureItem(COOKIE_KEY, cookieValue);
};

export const getCookie = async (): Promise<string | null> => {
  return getSecureItem(COOKIE_KEY);
};

export const clearCookie = async (): Promise<void> => {
  await deleteSecureItem(COOKIE_KEY);
};

const parseMemberCookie = (setCookieHeader: string | string[]): string | null => {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const header of headers) {
    const match = header.match(/member_token=([^;]+)/);
    if (match) return `member_token=${match[1]}`;
  }
  return null;
};

const api: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const AUTH_PATHS = ['/member/auth/login', '/member/auth/me', '/member/auth/logout'];

let onUnauthorized: (() => void) | null = null;

/**
 * AuthContext registers this so an expired session anywhere in the app lands
 * the member back on the login screen through the normal auth flow, instead
 * of every screen showing its own "401" error.
 */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Bodies and cookies are never logged: they carry passwords, session tokens
  // and the member's health data.
  if (__DEV__) console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);

  // A request with no network interface can only fail after the full timeout;
  // fail it now with an error the UI can tell apart from "server is down".
  if (getConnectivity().hardOffline) {
    throw new ApiError('offline', failureMessage('offline'), undefined, false);
  }

  // Browsers manage httpOnly cookies via withCredentials; manual Cookie headers
  // are forbidden on web and cross-site LAN IPs break SameSite cookies.
  if (!isWeb) {
    const cookie = await getCookie();
    if (cookie) config.headers['Cookie'] = cookie;
  }
  return config;
});

api.interceptors.response.use(
  async (response: AxiosResponse) => {
    const setCookie =
      response.headers['set-cookie'] ??
      response.headers['Set-Cookie'];

    if (!isWeb && setCookie) {
      const cookieStr = parseMemberCookie(setCookie);
      if (cookieStr) await storeCookie(cookieStr);
    }
    return response;
  },
  (error) => {
    // Thrown by the request interceptor above — already classified.
    if (error instanceof ApiError) return Promise.reject(error);

    const status: number | undefined = error.response?.status;
    const url: string = error.config?.url ?? '';
    const isAuthRequest = AUTH_PATHS.some((p) => url.includes(p));
    const kind = classifyFailure({
      status,
      code: error.code,
      message: error.message,
      deviceOffline: getConnectivity().isOffline,
    });

    const isExpectedMissingProfile = kind === 'not_found' && url.includes('/member/profile');
    if (__DEV__ && !isExpectedMissingProfile && kind !== 'cancelled') {
      console.warn(`[API] ${error.config?.method?.toUpperCase()} ${url} failed: ${kind}${status ? ` (${status})` : ''}`);
    }

    // Login's own 401 is "wrong password", not an expired session.
    if (kind === 'unauthorized' && !url.includes('/member/auth/login')) {
      onUnauthorized?.();
    }

    const serverMessage = error.response?.data?.message;
    return Promise.reject(new ApiError(kind, failureMessage(kind, serverMessage, isAuthRequest), status));
  },
);

export default api;
