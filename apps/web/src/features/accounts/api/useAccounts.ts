import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateAccountDto, UpdateAccountDto } from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { AccountRow } from '../types';

const LIST_KEY = ['accounts', 'list'] as const;

export function useAccountsList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<AccountRow[]> => {
      const res = await apiClient.get<AccountRow[]>('/accounts');
      return res.data;
    },
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAccountDto): Promise<AccountRow> => {
      const res = await apiClient.post<AccountRow>('/accounts', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateAccountDto): Promise<AccountRow> => {
      const res = await apiClient.patch<AccountRow>(`/accounts/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/accounts/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
