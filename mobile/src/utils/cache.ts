import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'lm_cache_';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // ignore write errors
  }
}

export async function removeCached(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** TTL for user profile (longer, profile changes rarely). */
export const PROFILE_TTL_MS = 15 * 60 * 1000; // 15 min

/** TTL for list data (children, classes). */
export const LIST_TTL_MS = 5 * 60 * 1000; // 5 min
