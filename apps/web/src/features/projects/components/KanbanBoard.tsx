import { useMemo, useState } from 'react';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  type ProjectStatus,
} from '@iw001/shared';
import {
  useCreateTask,
  useDeleteTask,
  useMoveTask,
} from '../api/useProjects';
import type { TaskRow } from '../types';
import { TaskCard } from './TaskCard';

interface Props {
  projectId: string;
  tasks: TaskRow[];
}

/**
 * Four-column kanban view for a single project. Columns mirror the
 * ProjectStatus enum: todo / doing / done / archived. No drag-and-drop
 * library — the TaskCard's own status dropdown handles moves via the
 * useMoveTask optimistic mutation.
 */
export function KanbanBoard({ projectId, tasks }: Props) {
  const move = useMoveTask(projectId);
  const remove = useDeleteTask(projectId);
  const create = useCreateTask(projectId);

  const [composerFor, setComposerFor] = useState<ProjectStatus | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const byStatus = useMemo(() => {
    const m: Record<ProjectStatus, TaskRow[]> = {
      todo: [],
      doing: [],
      done: [],
      archived: [],
    };
    for (const t of tasks) m[t.status].push(t);
    return m;
  }, [tasks]);

  function submitNew(status: ProjectStatus) {
    const title = newTitle.trim();
    if (!title) {
      setComposerFor(null);
      return;
    }
    create.mutate(
      { title, status, priority: 'normal' },
      {
        onSuccess: () => {
          setNewTitle('');
          setComposerFor(null);
        },
      },
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {PROJECT_STATUS_ORDER.map((status) => (
        <Column
          key={status}
          status={status}
          tasks={byStatus[status]}
          onMove={(id, to) => move.mutate({ id, to })}
          onDelete={(id) => {
            if (confirm('태스크를 삭제하시겠습니까?')) remove.mutate(id);
          }}
          composerOpen={composerFor === status}
          composerValue={newTitle}
          onComposerChange={setNewTitle}
          onComposerOpen={() => {
            setComposerFor(status);
            setNewTitle('');
          }}
          onComposerCancel={() => {
            setComposerFor(null);
            setNewTitle('');
          }}
          onComposerSubmit={() => submitNew(status)}
        />
      ))}
    </div>
  );
}

interface ColumnProps {
  status: ProjectStatus;
  tasks: TaskRow[];
  onMove(id: string, to: ProjectStatus): void;
  onDelete(id: string): void;
  composerOpen: boolean;
  composerValue: string;
  onComposerChange(v: string): void;
  onComposerOpen(): void;
  onComposerCancel(): void;
  onComposerSubmit(): void;
}

const COLUMN_TONE: Record<ProjectStatus, string> = {
  todo: 'border-t-neutral-600',
  doing: 'border-t-blue-500',
  done: 'border-t-green-500',
  archived: 'border-t-neutral-800',
};

function Column({
  status,
  tasks,
  onMove,
  onDelete,
  composerOpen,
  composerValue,
  onComposerChange,
  onComposerOpen,
  onComposerCancel,
  onComposerSubmit,
}: ColumnProps) {
  return (
    <div
      className={`flex flex-col rounded-lg border border-neutral-800 border-t-2 bg-neutral-950/60 ${COLUMN_TONE[status]}`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-200">
            {PROJECT_STATUS_LABELS[status]}
          </h3>
          <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          className="text-xs text-neutral-500 hover:text-brand-400"
          onClick={onComposerOpen}
        >
          + 추가
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {composerOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onComposerSubmit();
            }}
            className="rounded-lg border border-brand-500/40 bg-neutral-900 p-2"
          >
            <input
              autoFocus
              type="text"
              className="input !py-1 text-sm"
              placeholder="새 태스크 제목"
              value={composerValue}
              onChange={(e) => onComposerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onComposerCancel();
              }}
            />
            <div className="mt-2 flex justify-end gap-1">
              <button
                type="button"
                className="text-[10px] text-neutral-500 hover:text-neutral-200"
                onClick={onComposerCancel}
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded bg-brand-500 px-2 py-0.5 text-[10px] font-medium text-neutral-950 hover:bg-brand-400"
              >
                추가
              </button>
            </div>
          </form>
        )}

        {tasks.length === 0 && !composerOpen && (
          <div className="rounded-lg border border-dashed border-neutral-800 p-4 text-center text-[10px] text-neutral-600">
            비어있음
          </div>
        )}

        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onMove={(to) => onMove(t.id, to)}
            onDelete={() => onDelete(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
