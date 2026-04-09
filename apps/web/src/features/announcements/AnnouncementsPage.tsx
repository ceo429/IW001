import { useState } from 'react';
import {
  useAnnouncementsList,
  useDeleteAnnouncement,
} from './api/useAnnouncements';
import { AnnouncementFormModal } from './components/AnnouncementFormModal';
import type { AnnouncementRow } from './types';

export function AnnouncementsPage() {
  const [editing, setEditing] = useState<AnnouncementRow | null | 'new'>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = useAnnouncementsList();
  const remove = useDeleteAnnouncement();

  const rows = list.data ?? [];
  const pinned = rows.filter((r) => r.pinned);
  const others = rows.filter((r) => !r.pinned);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">운영</div>
          <h1 className="mt-1 text-2xl font-bold">공지사항</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 공지
        </button>
      </div>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && rows.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          아직 등록된 공지가 없습니다.
        </div>
      )}

      {pinned.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-400">
            📌 상단 고정
          </h2>
          <ul className="space-y-2">
            {pinned.map((row) => (
              <AnnouncementCard
                key={row.id}
                row={row}
                expanded={expanded === row.id}
                onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                onEdit={() => setEditing(row)}
                onDelete={() => {
                  if (confirm('공지를 삭제하시겠습니까?')) remove.mutate(row.id);
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              일반 공지
            </h2>
          )}
          <ul className="space-y-2">
            {others.map((row) => (
              <AnnouncementCard
                key={row.id}
                row={row}
                expanded={expanded === row.id}
                onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
                onEdit={() => setEditing(row)}
                onDelete={() => {
                  if (confirm('공지를 삭제하시겠습니까?')) remove.mutate(row.id);
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {editing !== null && (
        <AnnouncementFormModal
          announcement={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AnnouncementCard({
  row,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  row: AnnouncementRow;
  expanded: boolean;
  onToggle(): void;
  onEdit(): void;
  onDelete(): void;
}) {
  return (
    <li className={`card ${row.pinned ? 'border-brand-500/40 ring-1 ring-brand-500/10' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onToggle}
        >
          <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
            {row.pinned && <span aria-label="고정">📌</span>}
            {row.title}
          </h3>
          {!expanded && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{row.body}</p>
          )}
          <div className="mt-2 text-[10px] text-neutral-500">
            {new Date(row.publishedAt).toLocaleString('ko-KR')}
          </div>
        </button>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            onClick={onEdit}
          >
            수정
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={onDelete}
          >
            삭제
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200">
          {row.body}
        </div>
      )}
    </li>
  );
}
