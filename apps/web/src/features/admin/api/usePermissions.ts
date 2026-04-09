import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PermissionChangePayload, PermissionRow } from '../types';

const LIST_KEY = ['permissions', 'list'] as const;

export function usePermissions() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<PermissionRow[]> => {
      const res = await apiClient.get<PermissionRow[]>('/permissions');
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdatePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (changes: PermissionChangePayload[]): Promise<void> => {
      await apiClient.patch('/permissions', { changes });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
