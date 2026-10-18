import { create } from 'zustand';
import { apiClient } from '../api/client';
import { tokenStorage } from '../api/tokenStorage';

export type User = {
  id: string;
  email: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const accessToken = await tokenStorage.getAccessToken();
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!accessToken && !refreshToken) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const res = await apiClient<{ user: User }>('/v1/auth/me');
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch {
      await tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const res = await apiClient<{ user: User; accessToken: string; refreshToken: string }>(
      '/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      },
    );

    await tokenStorage.setTokens(res.accessToken, res.refreshToken);
    set({ user: res.user, isAuthenticated: true });
  },

  register: async (email: string, password: string) => {
    const res = await apiClient<{ user: User; accessToken: string; refreshToken: string }>(
      '/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      },
    );

    await tokenStorage.setTokens(res.accessToken, res.refreshToken);
    set({ user: res.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await apiClient('/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      await tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },
}));
