import { useState } from 'react';
import {
  useCustomersList,
  useDeleteCustomer,
} from './api/useCustomers';
import { CustomerFormModal } from './components/CustomerFormModal';
import type { CustomerRow } from './types';

/**
 * Customers page — card grid with search and CRUD.
 */
export function CustomersPage() {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<CustomerRow | null | 'new'>(null);

  const list = useCustomersList(q.trim());
  const remove = useDeleteCustomer();

  const rows = list.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">고객</div>
          <h1 className="mt-1 text-2xl font-bold">고객관리</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 고객사
        </button>
      </div>

      <div className="mb-4 flex justify-end">
        <input
          type="search"
          className="input w-64"
          placeholder="회사명·대표자·사업자번호 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && rows.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          고객사가 없습니다. 오른쪽 상단에서 추가하세요.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <article key={c.id} className="card relative">
            <h3 className="text-lg font-semibold text-neutral-100">{c.name}</h3>
            {c.ceoName && <div className="text-xs text-neutral-500">대표: {c.ceoName}</div>}

            <dl className="mt-3 space-y-1 text-xs text-neutral-400">
              {c.bizNo && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">사업자</dt>
                  <dd className="font-mono text-neutral-300">{c.bizNo}</dd>
                </div>
              )}
              {c.phone && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">연락처</dt>
                  <dd className="text-neutral-300">{c.phone}</dd>
                </div>
              )}
              {c.email && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">이메일</dt>
                  <dd className="truncate text-neutral-300">{c.email}</dd>
                </div>
              )}
              {c.discountRate > 0 && (
                <div className="flex justify-between">
                  <dt className="text-neutral-500">기본 할인</dt>
                  <dd className="text-brand-400">{c.discountRate}%</dd>
                </div>
              )}
            </dl>

            <div className="mt-3 flex items-center gap-3 border-t border-neutral-800 pt-3 text-xs">
              <Stat label="장소" value={c._count?.homes ?? 0} />
              <Stat label="견적" value={c._count?.quotes ?? 0} />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                onClick={() => setEditing(c)}
              >
                수정
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => {
                  if (confirm(`"${c.name}" 고객사를 삭제하시겠습니까?`)) {
                    remove.mutate(c.id);
                  }
                }}
                disabled={remove.isPending}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
      </div>

      {remove.isError && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          삭제에 실패했습니다. 이 고객사는 연결된 견적서가 있어 삭제할 수 없습니다.
        </div>
      )}

      {editing !== null && (
        <CustomerFormModal
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-neutral-500">{label}</span>
      <span className="font-bold text-brand-400">{value}</span>
    </div>
  );
}
