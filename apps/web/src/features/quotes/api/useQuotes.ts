import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateQuoteDto,
  ListQuotesQuery,
  QuoteStatus,
  UpdateQuoteDto,
} from '@iw001/shared';
import { apiClient } from '@/lib/api-client';
import type { QuoteDetail, QuoteRow } from '../types';

/**
 * TanStack Query hooks for the quote feature. Every mutation invalidates the
 * list + affected detail query so the UI stays consistent without manual
 * refetch gymnastics.
 */

const LIST_KEY = ['quotes', 'list'] as const;
const DETAIL_KEY = (id: string) => ['quotes', 'detail', id] as const;

interface QuotesListResponse {
  data: QuoteRow[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
}

export function useQuotesList(query: ListQuotesQuery) {
  return useQuery({
    queryKey: [...LIST_KEY, query],
    queryFn: async (): Promise<QuotesListResponse> => {
      const res = await apiClient.get<QuotesListResponse>('/quotes', { params: query });
      return {
        ...res.data,
        data: res.data.data.map(normalizeQuoteRow),
      };
    },
    placeholderData: (previous) => previous,
  });
}

export function useQuoteDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? DETAIL_KEY(id) : ['quotes', 'detail', 'noop'],
    enabled: !!id,
    queryFn: async (): Promise<QuoteDetail> => {
      const res = await apiClient.get<QuoteDetail>(`/quotes/${id}`);
      return normalizeQuoteDetail(res.data);
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateQuoteDto): Promise<QuoteDetail> => {
      const res = await apiClient.post<QuoteDetail>('/quotes', dto);
      return normalizeQuoteDetail(res.data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useUpdateQuote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateQuoteDto): Promise<QuoteDetail> => {
      const res = await apiClient.patch<QuoteDetail>(`/quotes/${id}`, dto);
      return normalizeQuoteDetail(res.data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(id) });
    },
  });
}

export function useTransitionQuote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (to: QuoteStatus): Promise<QuoteDetail> => {
      const res = await apiClient.post<QuoteDetail>(`/quotes/${id}/transition`, { to });
      return normalizeQuoteDetail(res.data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(id) });
    },
  });
}

// ---- normalization --------------------------------------------------------

/**
 * Prisma Decimal columns come across the wire as strings. Convert once at
 * the query boundary so components can treat them as `number`.
 */
function normalizeQuoteRow(q: QuoteRow): QuoteRow {
  return {
    ...q,
    subtotal: Number(q.subtotal),
    discountTotal: Number(q.discountTotal),
    vatRate: Number(q.vatRate),
    vatAmount: Number(q.vatAmount),
    total: Number(q.total),
  };
}

function normalizeQuoteDetail(q: QuoteDetail): QuoteDetail {
  return {
    ...normalizeQuoteRow(q),
    items: q.items.map((i) => ({
      ...i,
      qty: Number(i.qty),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      lineTotal: Number(i.lineTotal),
      sortOrder: Number(i.sortOrder),
    })),
  } as QuoteDetail;
}
