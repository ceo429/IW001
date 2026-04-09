import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CustomerPick, ProductPick } from '../types';

/**
 * Lightweight data sources for the quote editor's pickers. Kept cheap — they
 * load once on mount and cache for 5 minutes.
 */

export function useCustomersForPicker() {
  return useQuery({
    queryKey: ['customers', 'picker'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CustomerPick[]> => {
      const res = await apiClient.get<CustomerPick[]>('/customers');
      return res.data.map((c) => ({ ...c, discountRate: Number(c.discountRate ?? 0) }));
    },
  });
}

export function useProductsForPicker(q: string) {
  return useQuery({
    queryKey: ['products', 'picker', q],
    staleTime: 60_000,
    queryFn: async (): Promise<ProductPick[]> => {
      const res = await apiClient.get<ProductPick[]>('/products', {
        params: q ? { q } : undefined,
      });
      return res.data.map((p) => ({
        ...p,
        unitPrice: Number(p.unitPrice),
        stock: Number(p.stock),
      }));
    },
  });
}
