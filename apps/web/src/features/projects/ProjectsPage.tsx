import { useEffect, useState } from 'react';
import {
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  type Priority,
  type ProjectStatus,
} from '@iw001/shared';
import {
  useDeleteProject,
  useProjectDetail,
  useProjectsList,
} from './api/useProjects';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectFormModal } from './components/ProjectFormModal';
import type { ProjectRow } from './types';

const STATUS_TONE: Record<ProjectStatus, string> = {
  todo: 'bg-neutral-700/50 text-neutral-300',
  doing: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40',
  done: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/40',
  archived: 'bg-neutral-800 text-neutral-500 line-through',
};

const PRIORITY_TONE: Record<Priority, string> = {
  low: 'bg-neutral-700 text-neutral-300',
  normal: 'bg-blue-500/20 text-blue-300',
  high: 'bg-amber-500/20 text-amber-300',
  urgent: 'bg-red-500/20 text-red-300',
};

/**
 * Projects & tasks page.
 *
 * Master/detail layout: project list on the left, kanban board for the
 * selected project on the right. Selecting a project fetches its detail
 * (which contains tasks). No calendar/card view yet — spec §4.2.2 mentions
 * 3 modes, kanban is the Phase 1 slice and the easiest to verify the
 * optimistic-update flow in `useMoveTask`.
 */
export function ProjectsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProjectRow | null | 'new'>(null);

  const list = useProjectsList();
  const detail = useProjectDetail(selectedId ?? undefined);
  const remove = useDeleteProject();

  const projects = list.data ?? [];
  const selected = selectedId ? projects.find((p) => p.id === selectedId) : undefined;

  useEffect(() => {
    if (!selectedId && projects.length > 0) {
      setSelectedId(projects[0]!.id);
    }
  }, [projects, selectedId]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">운영</div>
          <h1 className="mt-1 text-2xl font-bold">프로젝트 & 태스크</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 프로젝트
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
        {/* Left: project list */}
        <aside className="space-y-2">
          {list.isLoading && (
            <div className="card text-xs text-neutral-500">불러오는 중…</div>
          )}
          {!list.isLoading && projects.length === 0 && (
            <div className="card text-xs text-neutral-500">프로젝트가 없습니다.</div>
          )}
          {projects.map((p) => {
            const isActive = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`block w-full rounded-lg border p-3 text-left transition ${
                  isActive
                    ? 'border-brand-500/50 bg-brand-500/5'
                    : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-neutral-100">{p.title}</h3>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                  <span className={`rounded px-1.5 py-0.5 ${STATUS_TONE[p.status]}`}>
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 ${PRIORITY_TONE[p.priority]}`}>
                    {PRIORITY_LABELS[p.priority]}
                  </span>
                  <span className="ml-auto text-neutral-500">
                    {p._count?.tasks ?? 0}개 태스크
                  </span>
                </div>
                {p.customer && (
                  <div className="mt-1 text-[10px] text-neutral-500">
                    {p.customer.name}
                  </div>
                )}
              </button>
            );
          })}
        </aside>

        {/* Right: selected project detail */}
        <div className="min-w-0">
          {!selected && (
            <div className="card text-center text-sm text-neutral-500">
              왼쪽에서 프로젝트를 선택하세요.
            </div>
          )}

          {selected && (
            <>
              <div className="card mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-neutral-100">{selected.title}</h2>
                  {selected.customer && (
                    <div className="text-xs text-neutral-500">{selected.customer.name}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditing(selected)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="rounded px-3 py-2 text-xs text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => {
                      if (
                        confirm(
                          `"${selected.title}" 프로젝트를 삭제합니다.\n` +
                            '소속 태스크도 함께 삭제됩니다. 계속하시겠습니까?',
                        )
                      ) {
                        remove.mutate(selected.id, {
                          onSuccess: () => setSelectedId(null),
                        });
                      }
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>

              {detail.isLoading && (
                <div className="card text-center text-sm text-neutral-500">
                  태스크 로딩 중…
                </div>
              )}
              {detail.data && (
                <KanbanBoard projectId={detail.data.id} tasks={detail.data.tasks} />
              )}
            </>
          )}
        </div>
      </div>

      {editing !== null && (
        <ProjectFormModal
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
