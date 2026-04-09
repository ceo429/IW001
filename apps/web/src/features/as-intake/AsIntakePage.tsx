import { useMemo, useState } from 'react';
import {
  AS_STATUS_LABELS,
  AS_STATUS_ORDER,
  AS_STATUS_TRANSITIONS,
  type AsStatus,
} from '@iw001/shared';
import {
  useAsTicketsList,
  useDeleteAsTicket,
  useTransitionAsTicket,
} from './api/useAsTickets';
import { AsTicketFormModal } from './components/AsTicketFormModal';
import type { AsTicketRow } from './types';

/**
 * AS 인입건 — 4-column status board. Each column shows tickets in that
 * state; per-card dropdown moves between states, enforced by the shared
 * AS_STATUS_TRANSITIONS map. Backend re-validates the transition.
 */
export function AsIntakePage() {
  const [editing, setEditing] = useState<AsTicketRow | null | 'new'>(null);
  const list = useAsTicketsList();
  const transition = useTransitionAsTicket();
  const remove = useDeleteAsTicket();

  const tickets = list.data ?? [];

  const byStatus = useMemo(() => {
    const m: Record<AsStatus, AsTicketRow[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
    };
    for (const t of tickets) m[t.status].push(t);
    return m;
  }, [tickets]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">운영</div>
          <h1 className="mt-1 text-2xl font-bold">AS 인입건</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + AS 접수
        </button>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AS_STATUS_ORDER.map((s) => (
          <div key={s} className="card">
            <div className="text-xs text-neutral-500">{AS_STATUS_LABELS[s]}</div>
            <div
              className={`mt-2 text-3xl font-bold ${
                s === 'open' ? 'text-red-400' : s === 'closed' ? 'text-neutral-500' : 'text-brand-400'
              }`}
            >
              {byStatus[s].length}
            </div>
          </div>
        ))}
      </section>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && tickets.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          접수된 AS 티켓이 없습니다.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {AS_STATUS_ORDER.map((status) => (
          <StatusColumn
            key={status}
            status={status}
            tickets={byStatus[status]}
            onEdit={(t) => setEditing(t)}
            onTransition={(id, to) => transition.mutate({ id, to })}
            onDelete={(id) => {
              if (confirm('AS 티켓을 삭제하시겠습니까?')) remove.mutate(id);
            }}
          />
        ))}
      </div>

      {editing !== null && (
        <AsTicketFormModal
          ticket={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

const COLUMN_TONE: Record<AsStatus, string> = {
  open: 'border-t-red-500',
  in_progress: 'border-t-amber-500',
  resolved: 'border-t-green-500',
  closed: 'border-t-neutral-700',
};

function StatusColumn({
  status,
  tickets,
  onEdit,
  onTransition,
  onDelete,
}: {
  status: AsStatus;
  tickets: AsTicketRow[];
  onEdit(t: AsTicketRow): void;
  onTransition(id: string, to: AsStatus): void;
  onDelete(id: string): void;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border border-neutral-800 border-t-2 bg-neutral-950/60 ${COLUMN_TONE[status]}`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-semibold text-neutral-200">
          {AS_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
          {tickets.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {tickets.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-800 p-3 text-center text-[10px] text-neutral-600">
            비어있음
          </div>
        )}

        {tickets.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            onEdit={() => onEdit(t)}
            onTransition={(to) => onTransition(t.id, to)}
            onDelete={() => onDelete(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TicketCard({
  ticket,
  onEdit,
  onTransition,
  onDelete,
}: {
  ticket: AsTicketRow;
  onEdit(): void;
  onTransition(to: AsStatus): void;
  onDelete(): void;
}) {
  const allowed = AS_STATUS_TRANSITIONS[ticket.status];
  const ageMinutes = Math.round(
    (Date.now() - new Date(ticket.openedAt).getTime()) / 60000,
  );
  const ageLabel =
    ageMinutes < 60
      ? `${ageMinutes}분 전`
      : ageMinutes < 1440
        ? `${Math.round(ageMinutes / 60)}시간 전`
        : `${Math.round(ageMinutes / 1440)}일 전`;

  return (
    <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-xs text-neutral-100 hover:text-brand-400"
          onClick={onEdit}
          title="수정"
        >
          <div className="line-clamp-2 font-medium">{ticket.symptom}</div>
        </button>
        <button
          type="button"
          className="text-neutral-600 hover:text-red-400"
          onClick={onDelete}
          aria-label="삭제"
        >
          ✕
        </button>
      </div>

      {ticket.home && (
        <div className="mt-2 truncate text-[10px] text-neutral-500">
          {ticket.home.customer?.name ? `${ticket.home.customer.name} · ` : ''}
          {ticket.home.name}
        </div>
      )}

      {ticket.rootCause && (
        <div className="mt-2 rounded bg-neutral-950 p-1.5 text-[10px] text-neutral-400">
          <span className="text-neutral-500">원인: </span>
          <span className="line-clamp-2">{ticket.rootCause}</span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
        <span>{ageLabel}</span>
        {ticket.closedAt && (
          <span className="text-green-400">
            ✓ {new Date(ticket.closedAt).toLocaleDateString('ko-KR')}
          </span>
        )}
      </div>

      {allowed.length > 0 && (
        <div className="mt-2 border-t border-neutral-800 pt-2">
          <label className="text-[10px] text-neutral-500">이동</label>
          <select
            className="input mt-0.5 !py-1 text-xs"
            value=""
            onChange={(e) => {
              if (e.target.value) onTransition(e.target.value as AsStatus);
            }}
          >
            <option value="">— 선택 —</option>
            {allowed.map((s) => (
              <option key={s} value={s}>
                → {AS_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      )}
    </article>
  );
}
