import { useEffect, useState, type FormEvent } from 'react';
import {
  createProjectSchema,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  type CreateProjectDto,
  type Priority,
  type ProjectStatus,
} from '@iw001/shared';
import { useCreateProject, useUpdateProject } from '../api/useProjects';
import { useCustomersForPicker } from '@/features/quotes/api/usePickers';
import type { ProjectRow } from '../types';

/**
 * Reuses the quote editor's customer picker hook — a small bit of intentional
 * coupling that's cheaper than duplicating the query. If quotes ever moves
 * the picker, this import is the single follow-up.
 */
export function ProjectFormModal({
  project,
  onClose,
}: {
  project: ProjectRow | null;
  onClose(): void;
}) {
  const isEdit = !!project;
  const customers = useCustomersForPicker();
  const [form, setForm] = useState<{
    title: string;
    status: ProjectStatus;
    priority: Priority;
    customerId: string;
    dueAt: string;
  }>(() => ({
    title: project?.title ?? '',
    status: project?.status ?? 'todo',
    priority: project?.priority ?? 'normal',
    customerId: project?.customerId ?? '',
    dueAt: project?.dueAt ? project.dueAt.slice(0, 10) : '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dto: CreateProjectDto = {
      title: form.title,
      status: form.status,
      priority: form.priority,
      customerId: form.customerId || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
    };
    const parsed = createProjectSchema.safeParse(dto);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join('.') || '_root'] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    const mut = isEdit ? update.mutate : create.mutate;
    mut(parsed.data, { onSuccess: onClose });
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
        noValidate
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit ? '프로젝트 수정' : '새 프로젝트'}
          </h2>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-200"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="title">
              제목 *
            </label>
            <input
              id="title"
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="status">
                상태
              </label>
              <select
                id="status"
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))
                }
              >
                {PROJECT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="priority">
                우선순위
              </label>
              <select
                id="priority"
                className="input"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Priority }))
                }
              >
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="customer">
              고객사
            </label>
            <select
              id="customer"
              className="input"
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
            >
              <option value="">— 선택 안함 —</option>
              {customers.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="dueAt">
              마감일
            </label>
            <input
              id="dueAt"
              type="date"
              className="input"
              value={form.dueAt}
              onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
            />
          </div>
        </div>

        {(create.isError || update.isError) && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            저장에 실패했습니다.
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={create.isPending || update.isPending}
          >
            {create.isPending || update.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
