import { useState } from 'react';
import {
  useDeleteProduct,
  useProductsList,
  useProductsOverview,
} from './api/useProducts';
import { ProductFormModal } from './components/ProductFormModal';
import { CATEGORY_LABELS, CATEGORY_OPTIONS, type ProductRow } from './types';
import { krw } from '@/features/quotes/lib/recompute';

export function ProductsPage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [editing, setEditing] = useState<ProductRow | null | 'new'>(null);

  const overview = useProductsOverview();
  const list = useProductsList({
    q: q.trim() || undefined,
    category: category || undefined,
  });
  const remove = useDeleteProduct();

  const rows = list.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">재무</div>
          <h1 className="mt-1 text-2xl font-bold">품목관리</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 품목
        </button>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="총 품목" value={String(overview.data?.total ?? '—')} />
        <Kpi label="총 재고" value={String(overview.data?.totalStock ?? '—')} />
        <Kpi
          label="재고 부족"
          value={String(overview.data?.lowStock ?? '—')}
          warning={Number(overview.data?.lowStock ?? 0) > 0}
        />
        <Kpi label="카테고리" value={String(overview.data?.categoryCount ?? '—')} />
      </section>

      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={chipClass(category === '')}
            onClick={() => setCategory('')}
          >
            전체
          </button>
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={chipClass(category === c)}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
        <div className="ml-auto w-64">
          <input
            type="search"
            className="input"
            placeholder="품명·모델 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/80 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-left">카테고리</th>
              <th className="px-4 py-3 text-left">품명</th>
              <th className="px-4 py-3 text-left">모델</th>
              <th className="px-4 py-3 text-right">단가</th>
              <th className="px-4 py-3 text-right">재고</th>
              <th className="px-4 py-3 text-left">공급사</th>
              <th className="w-24 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {list.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs text-neutral-500">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!list.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs text-neutral-500">
                  품목이 없습니다.
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const low = p.stock <= p.minStock && p.minStock > 0;
              return (
                <tr key={p.id} className="transition hover:bg-neutral-800/40">
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {CATEGORY_LABELS[p.category] ?? p.category}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-100">{p.name}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{p.model ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-brand-400">
                    {krw.format(p.unitPrice)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular-nums ${
                      low ? 'text-red-400' : 'text-neutral-200'
                    }`}
                  >
                    {p.stock}
                    {low && <span className="ml-1 text-[10px]">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{p.supplier ?? '—'}</td>
                  <td className="px-2 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                        onClick={() => setEditing(p)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => {
                          if (confirm(`"${p.name}" 을(를) 삭제하시겠습니까?`)) {
                            remove.mutate(p.id);
                          }
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="card">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={`mt-2 text-3xl font-bold ${
          warning ? 'text-red-400' : 'text-brand-400'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function chipClass(active: boolean): string {
  return `rounded-md px-3 py-1 text-xs transition ${
    active
      ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40'
      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
  }`;
}
