import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ChartSeries } from '@/components/charts/types';

interface ByCustomerResponse {
  topByQuoteCount: ChartSeries;
  topByDeviceCount: ChartSeries;
}

interface ByProductResponse {
  byCategory: ChartSeries;
  topByStock: ChartSeries;
}

interface ByPeriodResponse {
  quotesPerMonth: ChartSeries;
  homesAddedPerMonth: ChartSeries;
}

/**
 * Separate query hooks per tab so switching tabs only refetches the
 * tab you are looking at. Each one is cached for 60 seconds because
 * analytics data rarely changes sub-minute.
 */

export function useStatsByCustomer() {
  return useQuery({
    queryKey: ['stats', 'by-customer'],
    staleTime: 60_000,
    queryFn: async (): Promise<ByCustomerResponse> => {
      const res = await apiClient.get<ByCustomerResponse>('/stats/by-customer');
      return res.data;
    },
  });
}

export function useStatsByProduct() {
  return useQuery({
    queryKey: ['stats', 'by-product'],
    staleTime: 60_000,
    queryFn: async (): Promise<ByProductResponse> => {
      const res = await apiClient.get<ByProductResponse>('/stats/by-product');
      return res.data;
    },
  });
}

export function useStatsByPeriod(year: number) {
  return useQuery({
    queryKey: ['stats', 'by-period', year],
    staleTime: 60_000,
    queryFn: async (): Promise<ByPeriodResponse> => {
      const res = await apiClient.get<ByPeriodResponse>('/stats/by-period', {
        params: { year },
      });
      return res.data;
    },
  });
}
