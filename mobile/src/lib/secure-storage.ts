import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

function webGet(key: string): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  return sessionStorage.getItem(key);
}

function webSet(key: string, value: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.setItem(key, value);
}

function webRemove(key: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(key);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webGet(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webSet(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webRemove(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string): Promise<void> {
    return setItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): Promise<void> {
    return setItem(REFRESH_TOKEN_KEY, token);
  },
  async clearTokens(): Promise<void> {
    await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
  },
};
