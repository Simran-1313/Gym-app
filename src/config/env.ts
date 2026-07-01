import { Platform } from 'react-native';

// Native emulators/devices reach the API via LAN IP; web must use localhost so
// httpOnly cookies are same-site (localhost:8081 → localhost:4000).
const nativeApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const webApiUrl = process.env.EXPO_PUBLIC_API_URL_WEB ?? 'http://localhost:4000';
const API_URL = Platform.OS === 'web' ? webApiUrl : nativeApiUrl;

export const ENV = {
  API_URL,
  API_BASE: `${API_URL}/api`,
} as const;
