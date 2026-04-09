import { useMemo, useState } from 'react';
import { useAccountsList, useDeleteAccount } from './api/useAccounts';
import { AccountFormModal } from './components/AccountFormModal';
import type { AccountRow } from './types';

/**
 * 헤이홈 계정 관리 — grouped by contract year (`period`), per spec §4.1.2.
 * Each card shows token status, home count, and linked customer.
 */
export function AccountsPage() {
  const [editing, setEditing] = useState<AccountRow | null | 'new'>(null);

  const list = useAccountsList();
  const remove = useDeleteAccount();

  const accounts = list.data ?? [];

  // Group by period. Use a Map to preserve insertion order so the newest
  // year (which comes first from the API) renders first.
  const grouped = useMemo(() => {
    const map = new Map<string, AccountRow[]>();
    for (const a of accounts) {
      if (!map.has(a.period)) map.set(a.period, []);
      map.get(a.period)!.push(a);
    }
    return map;
  }, [accounts]);

  const totalValid = accounts.filter((a) => a.tokenStatus === 'valid').length;
  const totalExpired = accounts.filter((a) => a.tokenStatus === 'expired').length;
  const totalHomes = accounts.reduce((sum, a) => sum + (a._count?.homes ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">모니터링</div>
          <h1 className="mt-1 text-2xl font-bold">계정관리 (헤이홈)</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 계정
        </button>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="전체 계정" value={String(accounts.length)} />
        <Kpi label="유효 토큰" value={String(totalValid)} />
        <Kpi
          label="만료 토큰"
          value={String(totalExpired)}
          warning={totalExpired > 0}
        />
        <Kpi label="총 연동 장소" value={String(totalHomes)} />
      </section>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && accounts.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          등록된 계정이 없습니다.
        </div>
      )}

      {[...grouped.entries()].map(([period, items]) => (
        <section key={period} className="mb-6">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-neutral-200">20{period}년 계약</h2>
            <span className="text-xs text-neutral-500">· {items.length}개 계정</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={() => setEditing(account)}
                onDelete={() => {
                  if (confirm(`"${account.email}" 계정을 삭제하시겠습니까?`)) {
                    remove.mutate(account.id);
                  }
                }}
              />
            ))}
          </div>
        </section>
      ))}

      {editing !== null && (
        <AccountFormModal
          account={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: AccountRow;
  onEdit(): void;
  onDelete(): void;
}) {
  const expired = account.tokenStatus === 'expired';
  return (
    <article
      className={`card relative ${
        expired ? 'border-red-500/40 ring-1 ring-red-500/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-sm text-neutral-100">
            {account.email}
          </div>
          {account.customer && (
            <div className="mt-0.5 text-xs text-neutral-500">
              {account.customer.name}
            </div>
          )}
        </div>
        <TokenBadge status={account.tokenStatus} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-neutral-400">
        <dt className="text-neutral-500">연동 장소</dt>
        <dd className="text-right font-mono text-brand-400">
          {account._count?.homes ?? 0}
        </dd>

        {account.tokenExpiresAt && (
          <>
            <dt className="text-neutral-500">만료일</dt>
            <dd className="text-right text-neutral-300">
              {new Date(account.tokenExpiresAt).toLocaleDateString('ko-KR')}
            </dd>
          </>
        )}
      </dl>

      <div className="mt-4 flex justify-end gap-1 border-t border-neutral-800 pt-3">
        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          onClick={onEdit}
        >
          수정
        </button>
        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
          onClick={onDelete}
        >
          삭제
        </button>
      </div>
    </article>
  );
}

function TokenBadge({ status }: { status: 'valid' | 'expired' }) {
  return status === 'valid' ? (
    <span className="inline-flex items-center rounded-md bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-300 ring-1 ring-green-500/40">
      ● 유효
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300 ring-1 ring-red-500/40">
      ● 만료
    </span>
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
