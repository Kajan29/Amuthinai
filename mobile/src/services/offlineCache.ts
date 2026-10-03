import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * NFR3 — the last successful response for a screen is kept on device so dashboards still
 * render without connectivity. Entries are served stale and refreshed in the background.
 */

const PREFIX = 'amuthinai.cache.';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

interface Entry<T> {
  value: T;
  storedAt: number;
}

export const offlineCache = {
  async read<T>(key: string, maxAgeMs: number = DEFAULT_TTL_MS): Promise<T | null> {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw) as Entry<T>;
      if (Date.now() - entry.storedAt > maxAgeMs) {
        await AsyncStorage.removeItem(PREFIX + key);
        return null;
      }
      return entry.value;
    } catch {
      await AsyncStorage.removeItem(PREFIX + key);
      return null;
    }
  },

  async write<T>(key: string, value: T): Promise<void> {
    const entry: Entry<T> = { value, storedAt: Date.now() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  },

  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((key) => key.startsWith(PREFIX));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  },
};
