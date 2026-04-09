import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateApprovalDto } from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { ApprovalRow } from '../types';

const LIST_KEY = ['approvals', 'list'] as const;

export function useApprovalsList(filter: 'mine' | 'assigned' | 'all') {
  return useQuery({
    queryKey: [...LIST_KEY, filter],
    queryFn: async (): Promise<ApprovalRow[]> => {
      const res = await apiClient.get<ApprovalRow[]>('/approvals', {
        params: { filter },
      });
      return res.data;
    },
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateApprovalDto): Promise<ApprovalRow> => {
      const res = await apiClient.post<ApprovalRow>('/approvals', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDecideApproval(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (decision: 'approve' | 'reject'): Promise<ApprovalRow> => {
      const res = await apiClient.post<ApprovalRow>(`/approvals/${id}/decide`, {
        decision,
      });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useCancelApproval(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<ApprovalRow> => {
      const res = await apiClient.post<ApprovalRow>(`/approvals/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
