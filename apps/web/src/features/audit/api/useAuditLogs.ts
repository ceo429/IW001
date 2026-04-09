import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  AuditFacets,
  AuditListResponse,
  AuditQueryParams,
} from '../types';

export function useAuditLogs(query: AuditQueryParams) {
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: async (): Promise<AuditListResponse> => {
      const res = await apiClient.get<AuditListResponse>('/audit-logs', {
        params: query,
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useAuditFacets() {
  return useQuery({
    queryKey: ['audit-logs', 'facets'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AuditFacets> => {
      const res = await apiClient.get<AuditFacets>('/audit-logs/facets');
      return res.data;
    },
  });
}
