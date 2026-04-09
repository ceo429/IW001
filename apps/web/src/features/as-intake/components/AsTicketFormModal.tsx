import { useEffect, useState, type FormEvent } from 'react';
import { createAsTicketSchema, type CreateAsTicketDto } from '@iw001/shared';
import { useCreateAsTicket, useUpdateAsTicket } from '../api/useAsTickets';
import { useHomesList } from '@/features/homes/api/useHomes';
import type { AsTicketRow } from '../types';

/**
 * Create/edit modal for an AS ticket. Reuses the homes feature list query
 * for the "장소" picker — the page has at most a few hundred homes so a
 * plain select is fine.
 */
export function AsTicketFormModal({
  ticket,
  onClose,
}: {
  ticket: AsTicketRow | null;
  onClose(): void;
}) {
  const isEdit = !!ticket;
  const homes = useHomesList({ filter: 'all' });
  const [form, setForm] = useState<CreateAsTicketDto>(() => ({
    homeId: ticket?.homeId ?? undefined,
    symptom: ticket?.symptom ?? '',
    rootCause: ticket?.rootCause ?? undefined,
    action: ticket?.action ?? undefined,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateAsTicket();
  const update = useUpdateAsTicket(ticket?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createAsTicketSchema.safeParse(form);
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
            {isEdit ? 'AS 티켓 수정' : 'AS 인입 접수'}
          </h2>
          <button type="button" className="text-neutral-500 hover:text-neutral-200" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="home">
              장소
            </label>
            <select
              id="home"
              className="input"
              value={form.homeId ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, homeId: e.target.value || undefined }))
              }
            >
              <option value="">— 선택 —</option>
              {homes.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.customer.name})
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
              className="input min-h-[80px]"
              value={form.symptom}
              onChange={(e) => setForm((f) => ({ ...f, symptom: e.target.value }))}
              placeholder="고객이 신고한 증상을 기록"
              required
            />
            {errors.symptom && (
              <p className="mt-1 text-xs text-red-400">{errors.symptom}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="rootCause">
              원인
            </label>
            <textarea
              id="rootCause"
              className="input min-h-[60px]"
              value={form.rootCause ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, rootCause: e.target.value || undefined }))
              }
              placeholder="진단 결과"
            />
          </div>

          <div>
            <label className="label" htmlFor="action">
              조치
            </label>
            <textarea
              id="action"
              className="input min-h-[60px]"
              value={form.action ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, action: e.target.value || undefined }))
              }
              placeholder="수행한 작업"
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
