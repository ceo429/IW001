import type { QuoteStatus } from '@iw001/shared';

const STATUS_STYLE: Record<
  QuoteStatus,
  { label: string; className: string }
> = {
  draft: { label: '초안', className: 'bg-neutral-700/60 text-neutral-200' },
  sent: { label: '발송', className: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40' },
  approved: {
    label: '승인',
    className: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/40',
  },
  rejected: { label: '거절', className: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40' },
  ordered: {
    label: '수주',
    className: 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40',
  },
  cancelled: {
    label: '취소',
    className: 'bg-neutral-800 text-neutral-500 line-through',
  },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}
