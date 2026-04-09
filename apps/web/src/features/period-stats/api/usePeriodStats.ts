import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ChartSeries } from '@/components/charts';

export interface MultiYearResponse {
  yearlyQuotes: ChartSeries;
  yearlyHomes: ChartSeries;
  yearlyDevices: ChartSeries;
  summary: {
    totalQuotes: number;
    totalHomes: number;
    totalDevices: number;
  };
}

export function useMultiYear(from: number, to: number) {
  return useQuery({
    queryKey: ['stats', 'multi-year', from, to],
    staleTime: 60_000,
    queryFn: async (): Promise<MultiYearResponse> => {
      const res = await apiClient.get<MultiYearResponse>('/stats/multi-year', {
        params: { from, to },
      });
      return res.data;
    },
  });
}
