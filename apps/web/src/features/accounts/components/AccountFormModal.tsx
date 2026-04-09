import { useEffect, useState, type FormEvent } from 'react';
import {
  createAccountSchema,
  type CreateAccountDto,
  type TokenStatus,
} from '@iw001/shared';
import { useCreateAccount, useUpdateAccount } from '../api/useAccounts';
import { useCustomersForPicker } from '@/features/quotes/api/usePickers';
import type { AccountRow } from '../types';

export function AccountFormModal({
  account,
  onClose,
}: {
  account: AccountRow | null;
  onClose(): void;
}) {
  const isEdit = !!account;
  const customers = useCustomersForPicker();

  const [form, setForm] = useState<{
    email: string;
    period: string;
    tokenStatus: TokenStatus;
    tokenExpiresAt: string;
    customerId: string;
  }>(() => ({
    email: account?.email ?? '',
    period: account?.period ?? String(new Date().getFullYear()).slice(-2),
    tokenStatus: account?.tokenStatus ?? 'valid',
    tokenExpiresAt: account?.tokenExpiresAt ? account.tokenExpiresAt.slice(0, 10) : '',
    customerId: account?.customerId ?? '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateAccount();
  const update = useUpdateAccount(account?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dto: CreateAccountDto = {
      email: form.email,
      period: form.period,
      tokenStatus: form.tokenStatus,
      tokenExpiresAt: form.tokenExpiresAt
        ? new Date(form.tokenExpiresAt).toISOString()
        : undefined,
      customerId: form.customerId || undefined,
    };
    const parsed = createAccountSchema.safeParse(dto);
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
            {isEdit ? '헤이홈 계정 수정' : '새 헤이홈 계정'}
          </h2>
          <button type="button" className="text-neutral-500 hover:text-neutral-200" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="email">
              이메일 *
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="period">
                계약 연도 (YY)
              </label>
              <input
                id="period"
                className="input"
                placeholder="26"
                maxLength={2}
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
              />
              {errors.period && <p className="mt-1 text-xs text-red-400">{errors.period}</p>}
            </div>
            <div>
              <label className="label" htmlFor="tokenStatus">
                토큰 상태
              </label>
              <select
                id="tokenStatus"
                className="input"
                value={form.tokenStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tokenStatus: e.target.value as TokenStatus }))
                }
              >
                <option value="valid">유효</option>
                <option value="expired">만료</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="tokenExpiresAt">
              토큰 만료일
            </label>
            <input
              id="tokenExpiresAt"
              type="date"
              className="input"
              value={form.tokenExpiresAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, tokenExpiresAt: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="label" htmlFor="customer">
              소속 고객사
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
        </div>

        {(create.isError || update.isError) && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            저장에 실패했습니다. 이메일 중복 또는 권한 부족일 수 있습니다.
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
