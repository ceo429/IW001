import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateUserDto, UpdateUserDto } from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { CreateUserResponse, ResetPasswordResponse, UserRow } from '../types';

const LIST_KEY = ['users', 'list'] as const;

export function useUsersList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<UserRow[]> => {
      const res = await apiClient.get<UserRow[]>('/users');
      return res.data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateUserDto): Promise<CreateUserResponse> => {
      const res = await apiClient.post<CreateUserResponse>('/users', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateUserDto): Promise<UserRow> => {
      const res = await apiClient.patch<UserRow>(`/users/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (id: string): Promise<ResetPasswordResponse> => {
      const res = await apiClient.post<ResetPasswordResponse>(
        `/users/${id}/reset-password`,
      );
      return res.data;
    },
  });
}
