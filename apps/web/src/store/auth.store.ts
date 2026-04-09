import { create } from 'zustand';
import type { RoleId } from '@iw001/shared';

/**
 * Auth store.
 *
 * Access token is kept IN MEMORY ONLY. We deliberately do NOT persist it to
 * localStorage — that would expose it to XSS. Refresh is handled by the
 * httpOnly cookie that /auth/refresh reads; this store never sees it.
 */
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: RoleId;
  mustChangePw: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAccessToken(token: string | null): void;
  setSession(token: string, user: AuthUser): void;
  clear(): void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setSession: (token, user) => set({ accessToken: token, user }),
  clear: () => set({ accessToken: null, user: null }),
}));
