import { useEffect, useState, type FormEvent } from 'react';
import { createAnnouncementSchema, type CreateAnnouncementDto } from '@iw001/shared';
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
} from '../api/useAnnouncements';
import type { AnnouncementRow } from '../types';

export function AnnouncementFormModal({
  announcement,
  onClose,
}: {
  announcement: AnnouncementRow | null;
  onClose(): void;
}) {
  const isEdit = !!announcement;
  const [form, setForm] = useState<CreateAnnouncementDto>({
    title: announcement?.title ?? '',
    body: announcement?.body ?? '',
    pinned: announcement?.pinned ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement(announcement?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createAnnouncementSchema.safeParse(form);
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
          <h2 className="text-lg font-bold">{isEdit ? '공지 수정' : '새 공지'}</h2>
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
            <label className="label" htmlFor="body">
              본문 *
            </label>
            <textarea
              id="body"
              className="input min-h-[160px]"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
            />
            {errors.body && <p className="mt-1 text-xs text-red-400">{errors.body}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
            />
            상단 고정
          </label>
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
