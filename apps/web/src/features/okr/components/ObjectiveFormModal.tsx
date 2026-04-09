import { useEffect, useState, type FormEvent } from 'react';
import {
  createObjectiveSchema,
  currentOkrPeriods,
  type CreateObjectiveDto,
} from '@iw001/shared';
import { useCreateObjective, useUpdateObjective } from '../api/useOkr';
import type { ObjectiveRow } from '../types';

export function ObjectiveFormModal({
  objective,
  defaultPeriod,
  onClose,
}: {
  objective: ObjectiveRow | null;
  defaultPeriod: string;
  onClose(): void;
}) {
  const isEdit = !!objective;
  const periods = currentOkrPeriods();

  const [form, setForm] = useState<CreateObjectiveDto>({
    title: objective?.title ?? '',
    description: objective?.description ?? undefined,
    period: objective?.period ?? defaultPeriod,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateObjective();
  const update = useUpdateObjective(objective?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createObjectiveSchema.safeParse(form);
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
        className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
        noValidate
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit ? '목표 수정' : '새 목표'}
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

          <div>
            <label className="label" htmlFor="description">
              설명
            </label>
            <textarea
              id="description"
              className="input min-h-[80px]"
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value || undefined }))
              }
            />
          </div>

          <div>
            <label className="label" htmlFor="period">
              분기 *
            </label>
            <select
              id="period"
              className="input"
              value={form.period}
              onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              {isEdit && !periods.includes(form.period as (typeof periods)[number]) && (
                <option value={form.period}>{form.period}</option>
              )}
            </select>
            {errors.period && <p className="mt-1 text-xs text-red-400">{errors.period}</p>}
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
