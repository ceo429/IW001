import { useEffect, useState, type FormEvent } from 'react';
import { createCustomerSchema, type CreateCustomerDto } from '@iw001/shared';
import { useCreateCustomer, useUpdateCustomer } from '../api/useCustomers';
import type { CustomerRow } from '../types';

export function CustomerFormModal({
  customer,
  onClose,
}: {
  customer: CustomerRow | null;
  onClose(): void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState<CreateCustomerDto>(() => ({
    name: customer?.name ?? '',
    ceoName: customer?.ceoName ?? undefined,
    bizNo: customer?.bizNo ?? undefined,
    phone: customer?.phone ?? undefined,
    email: customer?.email ?? undefined,
    address: customer?.address ?? undefined,
    discountRate: customer?.discountRate ?? 0,
    note: customer?.note ?? undefined,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateCustomer();
  const update = useUpdateCustomer(customer?.id ?? '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function patch<K extends keyof CreateCustomerDto>(key: K, value: CreateCustomerDto[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createCustomerSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join('.') || '_root'] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    const action = isEdit ? update.mutate : create.mutate;
    action(parsed.data, { onSuccess: onClose });
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
          <h2 className="text-lg font-bold">{isEdit ? '고객사 수정' : '새 고객사'}</h2>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-200"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label" htmlFor="name">
              회사명 *
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              required
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="ceoName">
              대표자
            </label>
            <input
              id="ceoName"
              className="input"
              value={form.ceoName ?? ''}
              onChange={(e) => patch('ceoName', e.target.value || undefined)}
            />
          </div>
          <div>
            <label className="label" htmlFor="bizNo">
              사업자등록번호
            </label>
            <input
              id="bizNo"
              className="input"
              placeholder="123-45-67890"
              value={form.bizNo ?? ''}
              onChange={(e) => patch('bizNo', e.target.value || undefined)}
            />
            {errors.bizNo && <p className="mt-1 text-xs text-red-400">{errors.bizNo}</p>}
          </div>

          <div>
            <label className="label" htmlFor="phone">
              연락처
            </label>
            <input
              id="phone"
              className="input"
              value={form.phone ?? ''}
              onChange={(e) => patch('phone', e.target.value || undefined)}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email ?? ''}
              onChange={(e) => patch('email', e.target.value || undefined)}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div className="col-span-2">
            <label className="label" htmlFor="address">
              주소
            </label>
            <input
              id="address"
              className="input"
              value={form.address ?? ''}
              onChange={(e) => patch('address', e.target.value || undefined)}
            />
          </div>

          <div>
            <label className="label" htmlFor="discountRate">
              기본 할인율 (%)
            </label>
            <input
              id="discountRate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              className="input"
              value={form.discountRate ?? 0}
              onChange={(e) =>
                patch('discountRate', Math.max(0, Math.min(100, Number(e.target.value) || 0)))
              }
            />
          </div>

          <div className="col-span-2">
            <label className="label" htmlFor="note">
              메모
            </label>
            <textarea
              id="note"
              className="input min-h-[60px]"
              value={form.note ?? ''}
              onChange={(e) => patch('note', e.target.value || undefined)}
            />
          </div>
        </div>

        {(create.isError || update.isError) && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            저장에 실패했습니다. 권한과 필수 항목을 확인하세요.
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
