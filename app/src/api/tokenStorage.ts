import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'matinee_access_token';
const REFRESH_TOKEN_KEY = 'matinee_refresh_token';

let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? memoryAccessToken;
        }
      } catch {
        // Fallback to memory
      }
      return memoryAccessToken;
    }
    try {
      return (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) ?? memoryAccessToken;
    } catch {
      return memoryAccessToken;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? memoryRefreshToken;
        }
      } catch {
        // Fallback to memory
      }
      return memoryRefreshToken;
    }
    try {
      return (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? memoryRefreshToken;
    } catch {
      return memoryRefreshToken;
    }
  },

  async setTokens(access: string, refresh: string): Promise<void> {
    memoryAccessToken = access;
    memoryRefreshToken = refresh;
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
          window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
        }
      } catch {
        // Fallback to memory
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    } catch {
      // Fall back to memory
    }
  },

  async clearTokens(): Promise<void> {
    memoryAccessToken = null;
    memoryRefreshToken = null;
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(ACCESS_TOKEN_KEY);
          window.localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      } catch {
        // Ignore
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore
    }
  },
};
