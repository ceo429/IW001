import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProductDto, UpdateProductDto } from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { ProductRow, ProductsOverview } from '../types';

/**
 * TanStack Query hooks for the products feature. Cache invalidation is
 * centralized so mutations never need to think about which keys to bump.
 */
const LIST_KEY = ['products', 'list'] as const;
const OVERVIEW_KEY = ['products', 'overview'] as const;

interface ListQuery {
  q?: string;
  category?: string;
}

export function useProductsList(query: ListQuery) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: async (): Promise<ProductRow[]> => {
      const res = await apiClient.get<ProductRow[]>('/products', { params: query });
      return res.data.map(normalize);
    },
    placeholderData: (prev) => prev,
  });
}

export function useProductsOverview() {
  return useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: async (): Promise<ProductsOverview> => {
      const res = await apiClient.get<ProductsOverview>('/products/overview');
      return res.data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateProductDto): Promise<ProductRow> => {
      const res = await apiClient.post<ProductRow>('/products', dto);
      return normalize(res.data);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateProductDto): Promise<ProductRow> => {
      const res = await apiClient.patch<ProductRow>(`/products/${id}`, dto);
      return normalize(res.data);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: LIST_KEY });
  void qc.invalidateQueries({ queryKey: OVERVIEW_KEY });
}

function normalize(p: ProductRow): ProductRow {
  return {
    ...p,
    unitPrice: Number(p.unitPrice),
    stock: Number(p.stock),
    minStock: Number(p.minStock),
  };
}
