import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import type { LoginDto, RoleId } from '@iw001/shared';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: RoleId;
    mustChangePw: boolean;
  };
}

/**
 * Login mutation hook. On success we hand the token + user record to the
 * auth store; the apiClient interceptor picks the token up from there on
 * subsequent calls.
 */
export function useLogin() {
  return useMutation({
    mutationFn: async (dto: LoginDto): Promise<LoginResponse> => {
      const res = await apiClient.post<LoginResponse>('/auth/login', dto);
      return res.data;
    },
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data.accessToken, data.user);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Even if server logout fails, we still clear local state.
      }
    },
    onSettled: () => {
      useAuthStore.getState().clear();
    },
  });
}
