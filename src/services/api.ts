import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../config/env';

const COOKIE_KEY = 'member_token_cookie';

export const storeCookie = async (cookieValue: string): Promise<void> => {
  await SecureStore.setItemAsync(COOKIE_KEY, cookieValue);
};

export const getCookie = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(COOKIE_KEY);
};

export const clearCookie = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(COOKIE_KEY);
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
  const cookie = await getCookie();
  if (cookie) {
    config.headers['Cookie'] = cookie;
  }
  return config;
});

api.interceptors.response.use(
  async (response: AxiosResponse) => {
    const setCookie =
      response.headers['set-cookie'] ??
      response.headers['Set-Cookie'];

    if (setCookie) {
      const cookieStr = parseMemberCookie(setCookie);
      if (cookieStr) await storeCookie(cookieStr);
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default api;
