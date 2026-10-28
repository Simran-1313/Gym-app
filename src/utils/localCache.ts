import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

/**
 * Small JSON cache for data the app should still show offline (the last diet
 * and workout plans). A 7-day plan is well past SecureStore's ~2KB value
 * limit, so this lives in the app's private document directory instead.
 * Every call swallows its own errors: a cache miss must never break a screen.
 */

const PREFIX = 'clasendra-cache-';
const isWeb = Platform.OS === 'web';

// Keys become file names; keep them to a safe character set.
const fileFor = (key: string) => new File(Paths.document, `${PREFIX}${key.replace(/[^\w.-]/g, '_')}.json`);

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    if (isWeb) {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const file = fileFor(key);
    if (!file.exists) return null;
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    const json = JSON.stringify(value);
    if (isWeb) {
      localStorage.setItem(PREFIX + key, json);
      return;
    }
    const file = fileFor(key);
    if (!file.exists) file.create();
    file.write(json);
  } catch {
    // Best effort — the next successful load writes again.
  }
}

export async function removeCache(key: string): Promise<void> {
  try {
    if (isWeb) {
      localStorage.removeItem(PREFIX + key);
      return;
    }
    const file = fileFor(key);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}
