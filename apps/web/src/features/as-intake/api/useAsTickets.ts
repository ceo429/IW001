import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AsStatus,
  CreateAsTicketDto,
  UpdateAsTicketDto,
} from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { AsTicketRow } from '../types';

const LIST_KEY = ['as-tickets', 'list'] as const;

export function useAsTicketsList(status?: AsStatus) {
  return useQuery({
    queryKey: [...LIST_KEY, status ?? 'all'],
    queryFn: async (): Promise<AsTicketRow[]> => {
      const res = await apiClient.get<AsTicketRow[]>('/as-tickets', {
        params: status ? { status } : undefined,
      });
      return res.data;
    },
  });
}

export function useCreateAsTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAsTicketDto): Promise<AsTicketRow> => {
      const res = await apiClient.post<AsTicketRow>('/as-tickets', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateAsTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateAsTicketDto): Promise<AsTicketRow> => {
      const res = await apiClient.patch<AsTicketRow>(`/as-tickets/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useTransitionAsTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; to: AsStatus }): Promise<AsTicketRow> => {
      const res = await apiClient.post<AsTicketRow>(
        `/as-tickets/${payload.id}/transition`,
        { to: payload.to },
      );
      return res.data;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      // Optimistically flip every cached list entry for this ticket.
      const snapshots: Array<[readonly unknown[], AsTicketRow[] | undefined]> = [];
      qc.getQueriesData<AsTicketRow[]>({ queryKey: LIST_KEY }).forEach(([key, data]) => {
        snapshots.push([key, data]);
        if (!data) return;
        qc.setQueryData<AsTicketRow[]>(
          key,
          data.map((t) => (t.id === payload.id ? { ...t, status: payload.to } : t)),
        );
      });
      return { snapshots };
    },
    onError: (_err, _payload, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteAsTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/as-tickets/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
