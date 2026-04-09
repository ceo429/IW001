import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { HomeDetail, HomeStatusRow, HomesOverview } from '../types';

const LIST_KEY = ['homes', 'list'] as const;

interface ListQuery {
  q?: string;
  filter?: 'all' | 'offline';
}

export function useHomesList(query: ListQuery) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: async (): Promise<HomeStatusRow[]> => {
      const res = await apiClient.get<HomeStatusRow[]>('/homes', { params: query });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useHomesOverview() {
  return useQuery({
    queryKey: ['homes', 'overview'],
    queryFn: async (): Promise<HomesOverview> => {
      const res = await apiClient.get<HomesOverview>('/homes/overview');
      return res.data;
    },
  });
}

export function useHomeDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['homes', 'detail', id],
    enabled: !!id,
    queryFn: async (): Promise<HomeDetail> => {
      const res = await apiClient.get<HomeDetail>(`/homes/${id}`);
      return res.data;
    },
  });
}
