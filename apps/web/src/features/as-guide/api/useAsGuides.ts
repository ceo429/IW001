import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateAsGuideDto,
  GuideDeviceType,
  UpdateAsGuideDto,
} from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { AsGuideRow } from '../types';

const LIST_KEY = ['as-guides', 'list'] as const;

export function useAsGuidesList(query: {
  q?: string;
  deviceType?: GuideDeviceType;
}) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: async (): Promise<AsGuideRow[]> => {
      const res = await apiClient.get<AsGuideRow[]>('/as-guides', { params: query });
      return res.data;
    },
  });
}

export function useCreateAsGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAsGuideDto): Promise<AsGuideRow> => {
      const res = await apiClient.post<AsGuideRow>('/as-guides', dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateAsGuide(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateAsGuideDto): Promise<AsGuideRow> => {
      const res = await apiClient.patch<AsGuideRow>(`/as-guides/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useIncrementAsGuideCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<AsGuideRow> => {
      const res = await apiClient.post<AsGuideRow>(`/as-guides/${id}/increment`);
      return res.data;
    },
    // Optimistic bump — the number clicks up immediately.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const snapshots: Array<[readonly unknown[], AsGuideRow[] | undefined]> = [];
      qc.getQueriesData<AsGuideRow[]>({ queryKey: LIST_KEY }).forEach(([key, data]) => {
        snapshots.push([key, data]);
        if (!data) return;
        qc.setQueryData<AsGuideRow[]>(
          key,
          data.map((g) => (g.id === id ? { ...g, caseCount: g.caseCount + 1 } : g)),
        );
      });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeleteAsGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/as-guides/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
