import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMaintenanceJobDto,
  UpdateMaintenanceJobDto,
} from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { MaintenanceJobRow } from '../types';

const LIST_KEY = ['maintenance', 'list'] as const;

export function useMaintenanceList(scope: 'upcoming' | 'past' | 'all') {
  return useQuery({
    queryKey: [...LIST_KEY, scope],
    queryFn: async (): Promise<MaintenanceJobRow[]> => {
      const res = await apiClient.get<MaintenanceJobRow[]>('/maintenance-jobs', {
        params: { scope },
      });
      return res.data;
    },
  });
}

export function useCreateMaintenanceJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateMaintenanceJobDto): Promise<MaintenanceJobRow> => {
      const res = await apiClient.post<MaintenanceJobRow>('/maintenance-jobs', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateMaintenanceJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateMaintenanceJobDto): Promise<MaintenanceJobRow> => {
      const res = await apiClient.patch<MaintenanceJobRow>(
        `/maintenance-jobs/${id}`,
        dto,
      );
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useToggleChecklistItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      index: number;
      done: boolean;
    }): Promise<MaintenanceJobRow> => {
      const res = await apiClient.post<MaintenanceJobRow>(
        `/maintenance-jobs/${id}/checklist/toggle`,
        payload,
      );
      return res.data;
    },
    // Optimistic toggle so the checkbox doesn't wait for the server.
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const snapshots: Array<[readonly unknown[], MaintenanceJobRow[] | undefined]> = [];
      qc.getQueriesData<MaintenanceJobRow[]>({ queryKey: LIST_KEY }).forEach(
        ([key, data]) => {
          snapshots.push([key, data]);
          if (!data) return;
          qc.setQueryData<MaintenanceJobRow[]>(
            key,
            data.map((job) =>
              job.id === id
                ? {
                    ...job,
                    checklist: job.checklist.map((item, i) =>
                      i === payload.index ? { ...item, done: payload.done } : item,
                    ),
                  }
                : job,
            ),
          );
        },
      );
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

export function useDeleteMaintenanceJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/maintenance-jobs/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
