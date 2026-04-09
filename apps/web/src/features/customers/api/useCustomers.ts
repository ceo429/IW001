import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCustomerDto, UpdateCustomerDto } from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { CustomerRow } from '../types';

const LIST_KEY = ['customers', 'list'] as const;

export function useCustomersList(q: string) {
  return useQuery({
    queryKey: [...LIST_KEY, q],
    queryFn: async (): Promise<CustomerRow[]> => {
      const res = await apiClient.get<CustomerRow[]>('/customers', {
        params: { mode: 'full', ...(q ? { q } : {}) },
      });
      return res.data.map(normalize);
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCustomerDto): Promise<CustomerRow> => {
      const res = await apiClient.post<CustomerRow>('/customers', dto);
      return normalize(res.data);
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateCustomerDto): Promise<CustomerRow> => {
      const res = await apiClient.patch<CustomerRow>(`/customers/${id}`, dto);
      return normalize(res.data);
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => invalidate(qc),
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: LIST_KEY });
  // Quotes picker cache should refresh after a customer edit too.
  void qc.invalidateQueries({ queryKey: ['customers', 'picker'] });
}

function normalize(c: CustomerRow): CustomerRow {
  return { ...c, discountRate: Number(c.discountRate ?? 0) };
}
