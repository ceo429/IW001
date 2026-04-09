import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  QUOTE_STATUS_TRANSITIONS,
  type QuoteStatus,
} from '@iw001/shared';
import { useQuoteDetail, useTransitionQuote } from './api/useQuotes';
import { QuoteStatusBadge } from './components/QuoteStatusBadge';
import { krw } from './lib/recompute';

const ACTION_LABEL: Record<QuoteStatus, string> = {
  draft: '초안으로',
  sent: '발송',
  approved: '승인',
  rejected: '거절',
  ordered: '수주 전환',
  cancelled: '취소',
};

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading, error } = useQuoteDetail(id);
  const transition = useTransitionQuote(id ?? '');

  if (isLoading) {
    return <div className="text-sm text-neutral-500">불러오는 중…</div>;
  }
  if (error || !quote) {
    return (
      <div className="card text-sm text-red-400">
        견적서를 불러올 수 없습니다.
        <div className="mt-2">
          <Link to="/quotes" className="text-brand-400 hover:underline">
            ← 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const nextStates = QUOTE_STATUS_TRANSITIONS[quote.status];
  const canEdit = quote.status === 'draft' || quote.status === 'rejected';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/quotes" className="text-xs text-neutral-500 hover:text-brand-400">
            ← 견적서 목록
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-brand-400">{quote.code}</h1>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <div className="mt-1 text-sm text-neutral-400">
            {quote.customer.name}
            {quote.home ? ` · ${quote.home.name}` : ''}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/quotes/${quote.id}/edit`)}
            >
              수정
            </button>
          )}
          {nextStates.map((to) => (
            <button
              key={to}
              type="button"
              className={to === 'cancelled' ? 'btn-secondary' : 'btn-primary'}
              disabled={transition.isPending}
              onClick={() => transition.mutate(to)}
            >
              {ACTION_LABEL[to]}
            </button>
          ))}
        </div>
      </div>

      {transition.isError && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          상태 변경에 실패했습니다. 전이 규칙을 확인하세요.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-300">품목</h2>
          <div className="overflow-hidden rounded-md border border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900/80 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">품명</th>
                  <th className="px-3 py-2 text-right">수량</th>
                  <th className="px-3 py-2 text-right">단가</th>
                  <th className="px-3 py-2 text-right">할인</th>
                  <th className="px-3 py-2 text-right">소계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {quote.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2">
                      <div>{it.name}</div>
                      {it.model && (
                        <div className="text-xs text-neutral-500">{it.model}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {it.qty}
                      <span className="ml-1 text-xs text-neutral-500">{it.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {krw.format(it.unitPrice)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-neutral-400">
                      {it.discount > 0 ? `${it.discount}%` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-neutral-100">
                      {krw.format(it.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {quote.note && (
            <div className="mt-4">
              <div className="mb-1 text-xs uppercase text-neutral-500">메모</div>
              <div className="whitespace-pre-wrap text-sm text-neutral-200">{quote.note}</div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-neutral-300">합계 (서버 확정)</h2>
          <Row label="공급가액" value={krw.format(quote.subtotal)} />
          <Row label="할인" value={`- ${krw.format(quote.discountTotal)}`} muted />
          <Row label={`부가세 (${quote.vatRate}%)`} value={krw.format(quote.vatAmount)} />
          <div className="my-3 border-t border-neutral-800" />
          <Row label="합계" value={krw.format(quote.total)} emphasis />

          <div className="mt-5 space-y-1 text-xs text-neutral-500">
            <div>발행: {formatDate(quote.issuedAt)}</div>
            <div>유효기간: {formatDate(quote.validUntil)}</div>
            {quote.createdBy && <div>작성: {quote.createdBy.name}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  emphasis,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${
        emphasis ? 'text-brand-400' : muted ? 'text-neutral-500' : 'text-neutral-200'
      } ${emphasis ? 'text-lg font-bold' : ''}`}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
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
