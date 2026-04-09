import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuoteStatus } from '@iw001/shared';
import { useQuotesList } from './api/useQuotes';
import { QuoteStatusBadge } from './components/QuoteStatusBadge';
import { krw } from './lib/recompute';

const STATUS_FILTERS: Array<{ id: QuoteStatus | 'all'; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'sent', label: '발송' },
  { id: 'approved', label: '승인' },
  { id: 'rejected', label: '거절' },
  { id: 'ordered', label: '수주' },
  { id: 'cancelled', label: '취소' },
];

export function QuotesListPage() {
  const [status, setStatus] = useState<QuoteStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const query = useQuotesList({
    page,
    pageSize,
    status: status === 'all' ? undefined : status,
    q: q.trim() || undefined,
  });

  const rows = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">재무</div>
          <h1 className="mt-1 text-2xl font-bold">견적서</h1>
        </div>
        <Link to="/quotes/new" className="btn-primary">
          + 새 견적서
        </Link>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setStatus(f.id);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 text-xs transition ${
                status === f.id
                  ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto w-64">
          <input
            type="search"
            className="input"
            placeholder="코드·고객사·메모 검색"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/80 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left">코드</th>
              <th className="px-4 py-3 text-left">고객사</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-right">합계</th>
              <th className="px-4 py-3 text-left">발행일</th>
              <th className="px-4 py-3 text-left">유효기간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {query.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-neutral-500">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!query.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-neutral-500">
                  견적서가 없습니다.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-neutral-800/40">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link to={`/quotes/${row.id}`} className="text-brand-400 hover:underline">
                    {row.code}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.customer.name}</td>
                <td className="px-4 py-3">
                  <QuoteStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {krw.format(row.total)}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400">
                  {formatDate(row.issuedAt)}
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400">
                  {formatDate(row.validUntil)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <div>
            총 {pagination.total}건 · {pagination.page} / {pagination.pageCount}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1 text-xs"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1 text-xs"
              disabled={pagination.page >= pagination.pageCount}
              onClick={() => setPage((p) => Math.min(pagination.pageCount, p + 1))}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR');
  } catch {
    return iso;
  }
}
