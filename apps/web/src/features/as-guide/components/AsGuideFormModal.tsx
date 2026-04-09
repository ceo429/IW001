import { useEffect, useState, type FormEvent } from 'react';
import {
  createAsGuideSchema,
  DEVICE_TYPE_LABELS,
  type CreateAsGuideDto,
  type GuideDeviceType,
} from '@iw001/shared';
import { useCreateAsGuide, useUpdateAsGuide } from '../api/useAsGuides';
import type { AsGuideRow } from '../types';

const DEVICE_TYPES: GuideDeviceType[] = [
  'switch',
  'hub',
  'plug',
  'sensor',
  'dc',
  'media',
  'etc',
];

export function AsGuideFormModal({
  guide,
  onClose,
}: {
  guide: AsGuideRow | null;
  onClose(): void;
}) {
  const isEdit = !!guide;
  const [form, setForm] = useState<CreateAsGuideDto>({
    deviceType: (guide?.deviceType as GuideDeviceType) ?? 'switch',
    symptom: guide?.symptom ?? '',
    rootCause: guide?.rootCause ?? '',
    action: guide?.action ?? '',
    tips: guide?.tips ?? undefined,
    caseCount: guide?.caseCount ?? 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateAsGuide();
  const update = useUpdateAsGuide(guide?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createAsGuideSchema.safeParse(form);
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
            {isEdit ? 'AS 가이드 수정' : '새 AS 가이드'}
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
            <label className="label" htmlFor="deviceType">
              기기 유형 *
            </label>
            <select
              id="deviceType"
              className="input"
              value={form.deviceType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  deviceType: e.target.value as GuideDeviceType,
                }))
              }
            >
              {DEVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DEVICE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="symptom">
              증상 *
            </label>
            <textarea
              id="symptom"
              className="input min-h-[60px]"
              value={form.symptom}
              onChange={(e) => setForm((f) => ({ ...f, symptom: e.target.value }))}
              required
            />
            {errors.symptom && (
              <p className="mt-1 text-xs text-red-400">{errors.symptom}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="rootCause">
              원인 *
            </label>
            <textarea
              id="rootCause"
              className="input min-h-[60px]"
              value={form.rootCause}
              onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))}
              required
            />
            {errors.rootCause && (
              <p className="mt-1 text-xs text-red-400">{errors.rootCause}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="action">
              조치 *
            </label>
            <textarea
              id="action"
              className="input min-h-[60px]"
              value={form.action}
              onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
              required
            />
            {errors.action && (
              <p className="mt-1 text-xs text-red-400">{errors.action}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="tips">
              팁
            </label>
            <textarea
              id="tips"
              className="input min-h-[50px]"
              value={form.tips ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, tips: e.target.value || undefined }))
              }
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
