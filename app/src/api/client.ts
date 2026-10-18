import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from './tokenStorage';

export class ApiError extends Error {
  code: string;
  status: number;
  requestId?: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, requestId?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.fields = fields;
  }
}

export const getApiBaseUrl = (): string => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  
  // On web, if configured use configured, else default to localhost:3000
  if (Platform.OS === 'web') {
    return configured || 'http://localhost:3000';
  }

  // If explicitly configured with a non-localhost IP or domain, use it
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }

  // On native mobile devices in development (Expo Go or dev client),
  // dynamically extract the host machine's LAN IP from the Expo bundler connection
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) {
      return `http://${host}:3000`;
    }
  }

  return configured || 'http://localhost:3000';
};

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await tokenStorage.clearTokens();
      return null;
    }

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    await tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    await tokenStorage.clearTokens();
    return null;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, headers = {}, ...rest } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      reqHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: reqHeaders });
  } catch (err) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network connection error');
  }

  // Handle 401 and token rotation
  if (res.status === 401 && !skipAuth && !endpoint.includes('/auth/')) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      reqHeaders.Authorization = `Bearer ${newAccessToken}`;
      try {
        res = await fetch(url, { ...rest, headers: reqHeaders });
      } catch {
        throw new ApiError(0, 'NETWORK_ERROR', 'Network connection error');
      }
    }
  }

  // Handle non-2xx responses
  if (!res.ok) {
    let errBody: { error?: { code?: string; message?: string; requestId?: string; fields?: Record<string, string> } } = {};
    try {
      errBody = await res.json();
    } catch {
      // Fallback
    }

    const code = errBody.error?.code || (res.status === 404 ? 'NOT_FOUND' : res.status === 429 ? 'RATE_LIMITED' : 'INTERNAL');
    const message = errBody.error?.message || res.statusText || 'Request failed';
    throw new ApiError(res.status, code, message, errBody.error?.requestId, errBody.error?.fields);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}
