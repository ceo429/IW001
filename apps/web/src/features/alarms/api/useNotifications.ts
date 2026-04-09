import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotifSeverity } from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { NotificationRow } from '../types';

const LIST_KEY = ['notifications', 'list'] as const;
const COUNT_KEY = ['notifications', 'unread-count'] as const;

export function useNotifications(query: {
  unreadOnly: boolean;
  severity?: NotifSeverity;
}) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: async (): Promise<NotificationRow[]> => {
      const params: Record<string, string> = {};
      if (query.unreadOnly) params.unreadOnly = 'true';
      if (query.severity) params.severity = query.severity;
      const res = await apiClient.get<NotificationRow[]>('/notifications', {
        params,
      });
      return res.data;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: COUNT_KEY,
    staleTime: 30_000,
    queryFn: async (): Promise<{ count: number }> => {
      const res = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return res.data;
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<NotificationRow> => {
      const res = await apiClient.post<NotificationRow>(`/notifications/${id}/read`);
      return res.data;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const snapshots: Array<[readonly unknown[], NotificationRow[] | undefined]> = [];
      qc.getQueriesData<NotificationRow[]>({ queryKey: LIST_KEY }).forEach(
        ([key, data]) => {
          snapshots.push([key, data]);
          if (!data) return;
          qc.setQueryData<NotificationRow[]>(
            key,
            data.map((n) => (n.id === id ? { ...n, read: true } : n)),
          );
        },
      );
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
      void qc.invalidateQueries({ queryKey: COUNT_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ updated: number }> => {
      const res = await apiClient.post<{ updated: number }>('/notifications/read-all');
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
      void qc.invalidateQueries({ queryKey: COUNT_KEY });
    },
  });
}
