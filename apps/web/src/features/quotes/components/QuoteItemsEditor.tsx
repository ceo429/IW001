import { useState } from 'react';
import type { ProductPick, QuoteEditorDraft } from '../types';
import { useProductsForPicker } from '../api/usePickers';
import { krw } from '../lib/recompute';

type DraftItem = QuoteEditorDraft['items'][number];

interface Props {
  items: DraftItem[];
  onChange(next: DraftItem[]): void;
}

/**
 * Editable line-item table for a quote.
 *
 * Three ways to add a line (mirrors 기획서 §4.3.1):
 *   1. "빈 줄 추가" → manual name/price entry
 *   2. Product search → click result to append
 *   3. Click "검색으로 선택" on an existing blank row to attach a product
 */
export function QuoteItemsEditor({ items, onChange }: Props) {
  const [searchFor, setSearchFor] = useState<number | 'new' | null>(null);

  function addBlank() {
    onChange([
      ...items,
      { productId: null, name: '', model: '', unit: 'EA', qty: 1, unitPrice: 0, discount: 0 },
    ]);
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function patch(idx: number, next: Partial<DraftItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...next } : it)));
  }

  function attach(product: ProductPick, idx: number | 'new') {
    const line: DraftItem = {
      productId: product.id,
      name: product.name,
      model: product.model ?? '',
      unit: product.unit,
      qty: 1,
      unitPrice: product.unitPrice,
      discount: 0,
    };
    if (idx === 'new') {
      onChange([...items, line]);
    } else {
      onChange(items.map((it, i) => (i === idx ? line : it)));
    }
    setSearchFor(null);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">품목</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1 text-xs"
            onClick={() => setSearchFor('new')}
          >
            + 카탈로그에서 선택
          </button>
          <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={addBlank}>
            + 빈 줄 추가
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">품명</th>
              <th className="px-3 py-2 text-left">모델</th>
              <th className="px-3 py-2 text-right">수량</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">할인율</th>
              <th className="px-3 py-2 text-right">소계</th>
              <th className="w-12 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-xs text-neutral-500">
                  품목이 없습니다. 위의 버튼으로 추가하세요.
                </td>
              </tr>
            )}
            {items.map((it, idx) => {
              const line = round2(it.unitPrice * it.qty * (1 - it.discount / 100));
              return (
                <tr key={idx} className="odd:bg-neutral-950/50">
                  <td className="px-3 py-2">
                    <input
                      className="input !border-transparent !bg-transparent !px-1 !py-0.5 text-sm"
                      value={it.name}
                      placeholder="품명"
                      onChange={(e) => patch(idx, { name: e.target.value, productId: null })}
                    />
                    {!it.productId && (
                      <button
                        type="button"
                        className="mt-1 text-[10px] text-brand-400 hover:underline"
                        onClick={() => setSearchFor(idx)}
                      >
                        🔍 검색으로 선택
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input !border-transparent !bg-transparent !px-1 !py-0.5 text-xs text-neutral-400"
                      value={it.model}
                      onChange={(e) => patch(idx, { model: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumberCell
                      value={it.qty}
                      onChange={(v) => patch(idx, { qty: v })}
                      integer
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumberCell
                      value={it.unitPrice}
                      onChange={(v) => patch(idx, { unitPrice: v, productId: null })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumberCell
                      value={it.discount}
                      onChange={(v) => patch(idx, { discount: Math.min(100, Math.max(0, v)) })}
                      suffix="%"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-neutral-200">
                    {krw.format(line)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      className="text-neutral-500 hover:text-red-400"
                      onClick={() => remove(idx)}
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {searchFor !== null && (
        <ProductPicker
          onCancel={() => setSearchFor(null)}
          onPick={(product) => attach(product, searchFor)}
        />
      )}
    </div>
  );
}

// -- small number-input cell ------------------------------------------------

function NumberCell({
  value,
  onChange,
  integer,
  suffix,
}: {
  value: number;
  onChange(v: number): void;
  integer?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        className="input !border-transparent !bg-transparent !px-1 !py-0.5 text-right font-mono text-xs tabular-nums"
        value={value}
        step={integer ? 1 : 'any'}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(integer ? Math.round(n) : n);
        }}
      />
      {suffix && <span className="text-xs text-neutral-500">{suffix}</span>}
    </div>
  );
}

// -- product picker modal ---------------------------------------------------

function ProductPicker({
  onCancel,
  onPick,
}: {
  onCancel(): void;
  onPick(p: ProductPick): void;
}) {
  const [q, setQ] = useState('');
  const { data: products = [], isLoading } = useProductsForPicker(q);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="mt-20 w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">품목 검색</h3>
          <button type="button" className="text-neutral-500 hover:text-neutral-200" onClick={onCancel}>
            ✕
          </button>
        </div>
        <input
          type="search"
          autoFocus
          className="input"
          placeholder="이름 또는 모델로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-neutral-800">
          {isLoading && <div className="p-4 text-xs text-neutral-500">검색 중…</div>}
          {!isLoading && products.length === 0 && (
            <div className="p-4 text-xs text-neutral-500">결과 없음</div>
          )}
          <ul className="divide-y divide-neutral-800">
            {products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-800"
                  onClick={() => onPick(p)}
                >
                  <div>
                    <div className="font-medium text-neutral-100">{p.name}</div>
                    <div className="text-xs text-neutral-500">
                      {p.category} · {p.model ?? '모델 미등록'}
                    </div>
                  </div>
                  <div className="font-mono text-xs tabular-nums text-brand-400">
                    {krw.format(p.unitPrice)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
