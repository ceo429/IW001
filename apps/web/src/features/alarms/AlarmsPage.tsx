import { useState } from 'react';
import { NOTIF_SEVERITY_LABELS, type NotifSeverity } from '@iw001/shared';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from './api/useNotifications';
import type { NotificationRow } from './types';

const SEVERITY_OPTIONS: Array<NotifSeverity | 'all'> = [
  'all',
  'info',
  'warning',
  'error',
  'critical',
];

const SEVERITY_TONE: Record<NotifSeverity, string> = {
  info: 'bg-blue-500/20 text-blue-300 ring-blue-500/40',
  warning: 'bg-amber-500/20 text-amber-300 ring-amber-500/40',
  error: 'bg-red-500/20 text-red-300 ring-red-500/40',
  critical: 'bg-red-500/40 text-red-100 ring-red-500/70',
};

const SEVERITY_BORDER: Record<NotifSeverity, string> = {
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
  error: 'border-l-red-500',
  critical: 'border-l-red-700',
};

export function AlarmsPage() {
  const [severity, setSeverity] = useState<NotifSeverity | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const list = useNotifications({
    unreadOnly,
    severity: severity === 'all' ? undefined : severity,
  });
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const rows = list.data ?? [];
  const unreadCount = unread.data?.count ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">시스템</div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            알림관리
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300 ring-1 ring-red-500/40">
                {unreadCount} 미읽음
              </span>
            )}
          </h1>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={markAllRead.isPending || unreadCount === 0}
          onClick={() => markAllRead.mutate()}
        >
          모두 읽음
        </button>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={chip(severity === s)}
              onClick={() => setSeverity(s)}
            >
              {s === 'all' ? '전체' : NOTIF_SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />
          미읽음만 보기
        </label>
      </div>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && rows.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          표시할 알림이 없습니다.
        </div>
      )}

      <ul className="space-y-2">
        {rows.map((row) => (
          <NotificationItem
            key={row.id}
            row={row}
            onMarkRead={() => markRead.mutate(row.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function NotificationItem({
  row,
  onMarkRead,
}: {
  row: NotificationRow;
  onMarkRead(): void;
}) {
  return (
    <li
      className={`card border-l-4 ${SEVERITY_BORDER[row.severity]} ${
        row.read ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-neutral-100">{row.title}</h3>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                SEVERITY_TONE[row.severity]
              }`}
            >
              {NOTIF_SEVERITY_LABELS[row.severity]}
            </span>
            {row.userId === null && (
              <span className="rounded bg-neutral-700/60 px-1.5 py-0.5 text-[10px] text-neutral-300">
                📢 공지
              </span>
            )}
            {!row.read && (
              <span className="inline-block h-2 w-2 rounded-full bg-brand-500" aria-label="읽지 않음" />
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-400">{row.body}</p>
          <div className="mt-2 text-[10px] text-neutral-500">
            {new Date(row.createdAt).toLocaleString('ko-KR')}
          </div>
        </div>
        {!row.read && (
          <button
            type="button"
            className="text-xs text-neutral-500 hover:text-brand-400"
            onClick={onMarkRead}
          >
            읽음
          </button>
        )}
      </div>
    </li>
  );
}

function chip(active: boolean): string {
  return `rounded-md px-3 py-1 text-xs transition ${
    active
      ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40'
      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
  }`;
}
