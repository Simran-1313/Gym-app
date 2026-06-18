const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const ENV = {
  API_URL,
  API_BASE: `${API_URL}/api`,
} as const;
