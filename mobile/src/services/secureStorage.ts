import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token storage. SecureStore is backed by the iOS keychain / Android keystore and is not
 * available on web, where we fall back to localStorage.
 */

const ACCESS_TOKEN_KEY = 'amuthinai.accessToken';
const REFRESH_TOKEN_KEY = 'amuthinai.refreshToken';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  getAccessToken: () => getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => getItem(REFRESH_TOKEN_KEY),

  async saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) await setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  async clear(): Promise<void> {
    await Promise.all([removeItem(ACCESS_TOKEN_KEY), removeItem(REFRESH_TOKEN_KEY)]);
  },
};
