import { PRIORITY_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from '@iw001/shared';
import type { TaskRow } from '../types';

interface Props {
  task: TaskRow;
  onMove(to: TaskRow['status']): void;
  onDelete(): void;
}

const PRIORITY_TONE: Record<TaskRow['priority'], string> = {
  low: 'bg-neutral-700 text-neutral-300',
  normal: 'bg-blue-500/20 text-blue-300',
  high: 'bg-amber-500/20 text-amber-300',
  urgent: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40',
};

export function TaskCard({ task, onMove, onDelete }: Props) {
  const overdue =
    task.dueAt &&
    new Date(task.dueAt).getTime() < Date.now() &&
    task.status !== 'done' &&
    task.status !== 'archived';

  return (
    <article
      className={`rounded-lg border bg-neutral-900 p-3 text-sm transition hover:border-brand-500/40 ${
        overdue ? 'border-red-500/50' : 'border-neutral-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-neutral-100">{task.title}</h4>
        <button
          type="button"
          className="text-neutral-600 hover:text-red-400"
          onClick={onDelete}
          aria-label="삭제"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
        <span
          className={`rounded px-1.5 py-0.5 ${PRIORITY_TONE[task.priority]}`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
        {task.dueAt && (
          <span className={overdue ? 'text-red-400' : 'text-neutral-500'}>
            📅 {new Date(task.dueAt).toLocaleDateString('ko-KR')}
          </span>
        )}
        {task.assignee && (
          <span className="ml-auto rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
            {task.assignee.name}
          </span>
        )}
      </div>

      {/*
        No drag-drop library. A small status dropdown gets us 90% of the
        kanban UX at 0% dependency cost. See docs/ROADMAP.md for the drag
        upgrade path (dnd-kit, Phase 3).
      */}
      <div className="mt-2 border-t border-neutral-800 pt-2">
        <label className="text-[10px] text-neutral-500">이동</label>
        <select
          className="input mt-0.5 !py-1 text-xs"
          value={task.status}
          onChange={(e) => onMove(e.target.value as TaskRow['status'])}
        >
          {PROJECT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
