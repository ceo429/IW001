import { useEffect, useState, type FormEvent } from 'react';
import { createProductSchema, type CreateProductDto } from '@iw001/shared';
import { useCreateProduct, useUpdateProduct } from '../api/useProducts';
import { CATEGORY_LABELS, CATEGORY_OPTIONS, type ProductRow } from '../types';

/**
 * Create/edit modal for a product. Uses the SAME zod schema as the server
 * (`createProductSchema`), so client and server agree on what "valid" means.
 */
export function ProductFormModal({
  product,
  onClose,
}: {
  product: ProductRow | null;
  onClose(): void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<CreateProductDto>(() => ({
    category: (product?.category as CreateProductDto['category']) ?? 'switch',
    name: product?.name ?? '',
    model: product?.model ?? undefined,
    unit: product?.unit ?? 'EA',
    unitPrice: product?.unitPrice ?? 0,
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
    supplier: product?.supplier ?? undefined,
    description: product?.description ?? undefined,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? '');

  // Close modal on ESC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function patch<K extends keyof CreateProductDto>(key: K, value: CreateProductDto[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = createProductSchema.safeParse(form);
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
          <h2 className="text-lg font-bold">
            {isEdit ? '품목 수정' : '새 품목 추가'}
          </h2>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-200"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="category">
              카테고리 *
            </label>
            <select
              id="category"
              className="input"
              value={form.category}
              onChange={(e) =>
                patch('category', e.target.value as CreateProductDto['category'])
              }
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="unit">
              단위
            </label>
            <input
              id="unit"
              className="input"
              value={form.unit}
              onChange={(e) => patch('unit', e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="label" htmlFor="name">
              품명 *
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

          <div className="col-span-2">
            <label className="label" htmlFor="model">
              모델
            </label>
            <input
              id="model"
              className="input"
              value={form.model ?? ''}
              onChange={(e) => patch('model', e.target.value || undefined)}
            />
          </div>

          <div>
            <label className="label" htmlFor="unitPrice">
              단가 (원) *
            </label>
            <input
              id="unitPrice"
              type="number"
              min={0}
              className="input"
              value={form.unitPrice}
              onChange={(e) => patch('unitPrice', Number(e.target.value) || 0)}
              required
            />
            {errors.unitPrice && (
              <p className="mt-1 text-xs text-red-400">{errors.unitPrice}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="supplier">
              공급사
            </label>
            <input
              id="supplier"
              className="input"
              value={form.supplier ?? ''}
              onChange={(e) => patch('supplier', e.target.value || undefined)}
            />
          </div>

          <div>
            <label className="label" htmlFor="stock">
              재고
            </label>
            <input
              id="stock"
              type="number"
              min={0}
              className="input"
              value={form.stock}
              onChange={(e) => patch('stock', Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label" htmlFor="minStock">
              최소 재고
            </label>
            <input
              id="minStock"
              type="number"
              min={0}
              className="input"
              value={form.minStock}
              onChange={(e) => patch('minStock', Number(e.target.value) || 0)}
            />
          </div>

          <div className="col-span-2">
            <label className="label" htmlFor="description">
              설명
            </label>
            <textarea
              id="description"
              className="input min-h-[60px]"
              value={form.description ?? ''}
              onChange={(e) => patch('description', e.target.value || undefined)}
            />
          </div>
        </div>

        {(create.isError || update.isError) && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            저장에 실패했습니다. 권한을 확인하세요.
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
