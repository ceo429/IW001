import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

/**
 * Centralized axios instance.
 *
 * Responsibilities:
 *   - Attach the Access Token from Zustand (memory-only — never localStorage)
 *   - On 401, try POST /auth/refresh once; on success, retry the original
 *     request with the new token. On failure, log the user out cleanly.
 *   - `withCredentials: true` so the httpOnly refresh cookie is sent to
 *     /auth/refresh. No other endpoint relies on cookies.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- 401 -> refresh -> retry (single-flight) ----

let refreshInFlight: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const res = await axios.post<{ accessToken: string }>(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const next = res.data.accessToken;
  useAuthStore.getState().setAccessToken(next);
  return next;
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError & { config?: InternalAxiosRequestConfig & { __retry?: boolean } }) => {
    const status = error.response?.status;
    const original = error.config;

    if (status !== 401 || !original || original.__retry) {
      return Promise.reject(error);
    }

    // Do not try to refresh if the failing call is the refresh endpoint itself.
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      useAuthStore.getState().clear();
      return Promise.reject(error);
    }

    original.__retry = true;
    try {
      refreshInFlight ??= performRefresh();
      const next = await refreshInFlight;
      refreshInFlight = null;
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${next}`;
      return apiClient.request(original);
    } catch (refreshErr) {
      refreshInFlight = null;
      useAuthStore.getState().clear();
      return Promise.reject(refreshErr);
    }
  },
);
