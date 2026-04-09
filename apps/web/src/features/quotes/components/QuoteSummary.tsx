import { krw, type ClientQuoteTotals } from '../lib/recompute';

/**
 * Right-rail summary card used on the editor. Every number here is PREVIEW
 * only — the server re-computes on submit and the response replaces these
 * values. We explicitly call that out in the footer so reviewers can't
 * confuse preview totals with authoritative totals.
 */
export function QuoteSummary({ totals }: { totals: ClientQuoteTotals }) {
  return (
    <aside className="card sticky top-4 w-full max-w-xs">
      <h3 className="mb-3 text-sm font-semibold text-neutral-300">금액 미리보기</h3>

      <Row label="공급가액" value={krw.format(totals.subtotal)} />
      <Row
        label="할인"
        value={`- ${krw.format(totals.discountTotal)}`}
        muted
      />
      <Row label={`부가세 (${totals.vatRate}%)`} value={krw.format(totals.vatAmount)} />

      <div className="my-3 border-t border-neutral-800" />

      <Row label="합계" value={krw.format(totals.total)} emphasis />

      <p className="mt-4 text-[10px] leading-snug text-neutral-500">
        위 금액은 브라우저가 계산한 <b>미리보기</b>입니다. 저장 시 서버가
        카탈로그 단가·할인을 재계산하며, 저장 후 표시되는 금액이 최종값입니다.
      </p>
    </aside>
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
