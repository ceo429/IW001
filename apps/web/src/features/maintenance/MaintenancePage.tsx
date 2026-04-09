import { useState } from 'react';
import {
  useDeleteMaintenanceJob,
  useMaintenanceList,
  useToggleChecklistItem,
} from './api/useMaintenance';
import { MaintenanceFormModal } from './components/MaintenanceFormModal';
import type { MaintenanceJobRow } from './types';

type Tab = 'upcoming' | 'past' | 'all';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'upcoming', label: '예정' },
  { id: 'past', label: '완료/지난' },
  { id: 'all', label: '전체' },
];

export function MaintenancePage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [composerOpen, setComposerOpen] = useState(false);

  const list = useMaintenanceList(tab);
  const remove = useDeleteMaintenanceJob();

  const jobs = list.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">관리</div>
          <h1 className="mt-1 text-2xl font-bold">유지보수</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setComposerOpen(true)}>
          + 일정 추가
        </button>
      </div>

      <nav className="mb-4 flex gap-1 border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && jobs.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          {tab === 'upcoming' ? '예정된 일정이 없습니다.' : '일정이 없습니다.'}
        </div>
      )}

      <ul className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onDelete={() => {
              if (confirm('이 유지보수 일정을 삭제하시겠습니까?')) {
                remove.mutate(job.id);
              }
            }}
          />
        ))}
      </ul>

      {composerOpen && <MaintenanceFormModal onClose={() => setComposerOpen(false)} />}
    </div>
  );
}

function JobCard({
  job,
  onDelete,
}: {
  job: MaintenanceJobRow;
  onDelete(): void;
}) {
  const toggle = useToggleChecklistItem(job.id);
  const scheduled = new Date(job.scheduledAt);
  const isOverdue = !job.done && scheduled.getTime() < Date.now();

  const completed = job.checklist.filter((c) => c.done).length;
  const total = job.checklist.length;

  return (
    <li
      className={`card ${
        job.done
          ? 'opacity-70'
          : isOverdue
            ? 'border-red-500/40 ring-1 ring-red-500/20'
            : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-100">
            {job.home.name}
            {job.done && (
              <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-300 ring-1 ring-green-500/40">
                완료
              </span>
            )}
            {isOverdue && !job.done && (
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300 ring-1 ring-red-500/40">
                지연
              </span>
            )}
          </h3>
          {job.home.customer && (
            <div className="text-xs text-neutral-500">{job.home.customer.name}</div>
          )}
          <div className="mt-1 text-xs text-neutral-400">
            📅 {scheduled.toLocaleString('ko-KR')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-neutral-500">체크리스트</div>
            <div className="font-mono text-sm text-brand-400">
              {completed}/{total}
            </div>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={onDelete}
            aria-label="삭제"
          >
            ✕
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-1 rounded-md border border-neutral-800 bg-neutral-950/50 p-3">
        {job.checklist.map((item, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-neutral-900">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) =>
                  toggle.mutate({ index: i, done: e.target.checked })
                }
              />
              <span
                className={item.done ? 'text-neutral-500 line-through' : 'text-neutral-200'}
              >
                {item.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </li>
  );
}
