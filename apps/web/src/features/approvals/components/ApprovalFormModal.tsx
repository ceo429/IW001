import { useEffect, useState, type FormEvent } from 'react';
import { createApprovalSchema, type CreateApprovalDto } from '@iw001/shared';
import { useCreateApproval } from '../api/useApprovals';
import { useUsersList } from '@/features/users/api/useUsers';
import { useAuthStore } from '@/store/auth.store';

export function ApprovalFormModal({ onClose }: { onClose(): void }) {
  const me = useAuthStore((s) => s.user);
  const users = useUsersList();
  const create = useCreateApproval();

  const [form, setForm] = useState<CreateApprovalDto>({
    title: '',
    body: '',
    approverIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleApprover(userId: string) {
    setForm((f) => ({
      ...f,
      approverIds: f.approverIds.includes(userId)
        ? f.approverIds.filter((id) => id !== userId)
        : [...f.approverIds, userId],
    }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createApprovalSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join('.') || '_root'] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    create.mutate(parsed.data, { onSuccess: onClose });
  }

  // Hide the current user from the approver list — server will reject
  // self-approval anyway, but not showing it is cleaner UX.
  const pickable = (users.data ?? []).filter((u) => u.id !== me?.id);

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
          <h2 className="text-lg font-bold">새 결재 상신</h2>
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
              내용 *
            </label>
            <textarea
              id="body"
              className="input min-h-[120px]"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
            />
            {errors.body && <p className="mt-1 text-xs text-red-400">{errors.body}</p>}
          </div>

          <div>
            <label className="label">결재선 *</label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950">
              {users.isLoading && (
                <div className="p-3 text-xs text-neutral-500">사용자 불러오는 중…</div>
              )}
              {users.data &&
                pickable.map((u) => {
                  const picked = form.approverIds.includes(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-neutral-900 px-3 py-2 text-sm last:border-0 hover:bg-neutral-900"
                    >
                      <input
                        type="checkbox"
                        checked={picked}
                        onChange={() => toggleApprover(u.id)}
                      />
                      <div className="flex-1">
                        <div className="text-neutral-100">{u.name}</div>
                        <div className="text-[10px] text-neutral-500">
                          {u.email} · {u.role}
                        </div>
                      </div>
                    </label>
                  );
                })}
            </div>
            {errors.approverIds && (
              <p className="mt-1 text-xs text-red-400">{errors.approverIds}</p>
            )}
            <p className="mt-1 text-[10px] text-neutral-500">
              선택됨: {form.approverIds.length}명 (본인 제외)
            </p>
          </div>
        </div>

        {create.isError && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            저장에 실패했습니다.
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? '상신 중…' : '상신'}
          </button>
        </div>
      </form>
    </div>
  );
}
