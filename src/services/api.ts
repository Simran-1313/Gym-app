import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../utils/secureStorage';

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

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  console.log(`[API Request Interceptor] ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url}`);
  if (config.data) {
    console.log('[API Request Interceptor] body:', JSON.stringify(config.data, null, 2));
  }
  // Browsers manage httpOnly cookies via withCredentials; manual Cookie headers
  // are forbidden on web and cross-site LAN IPs break SameSite cookies.
  if (!isWeb) {
    const cookie = await getCookie();
    if (cookie) {
      console.log('[API Request Interceptor] Found cookie in SecureStore, attaching to request header...');
      config.headers['Cookie'] = cookie;
    } else {
      console.log('[API Request Interceptor] No cookie found in SecureStore.');
    }
  }
  return config;
});

api.interceptors.response.use(
  async (response: AxiosResponse) => {
    console.log(`[API Response Interceptor] Received successful response from URL: ${response.config.url}`);
    const setCookie =
      response.headers['set-cookie'] ??
      response.headers['Set-Cookie'];

    if (!isWeb) {
      if (setCookie) {
        console.log('[API Response Interceptor] set-cookie header present, parsing cookie...');
        const cookieStr = parseMemberCookie(setCookie);
        if (cookieStr) {
          console.log('[API Response Interceptor] Storing member cookie to SecureStore...');
          await storeCookie(cookieStr);
        } else {
          console.log('[API Response Interceptor] set-cookie header could not be parsed to member_token.');
        }
      } else {
        console.log('[API Response Interceptor] No set-cookie header found in response.');
      }
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isExpectedMissingProfile = status === 404 && url.includes('/member/profile');

    if (!isExpectedMissingProfile) {
      console.error(
        `[API Response Interceptor] Request failed for URL: ${url}. Error message:`,
        error.message,
      );
    }

    const message =
      error.response?.data?.message ??
      error.message ??
      'Request failed';
    return Promise.reject(new Error(message));
  },
);

export default api;
