import { useState } from 'react';
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from '@iw001/shared';
import {
  useApprovalsList,
  useCancelApproval,
  useDecideApproval,
} from './api/useApprovals';
import { ApprovalFormModal } from './components/ApprovalFormModal';
import { useAuthStore } from '@/store/auth.store';
import type { ApprovalRow } from './types';

type Tab = 'assigned' | 'mine' | 'all';

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: 'assigned', label: '나에게 결재 요청된 건', hint: '내가 결재자로 지정된 요청' },
  { id: 'mine', label: '내가 상신한 건', hint: '내가 요청한 결재' },
  { id: 'all', label: '전체', hint: '조직 전체 결재' },
];

export function ApprovalsPage() {
  const me = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('assigned');
  const [composerOpen, setComposerOpen] = useState(false);
  const [selected, setSelected] = useState<ApprovalRow | null>(null);

  const list = useApprovalsList(tab);
  const rows = list.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">관리</div>
          <h1 className="mt-1 text-2xl font-bold">결재센터</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setComposerOpen(true)}>
          + 결재 상신
        </button>
      </div>

      <nav className="mb-4 flex gap-1 border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSelected(null);
            }}
            className={`border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-200'
            }`}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
        <div>
          {list.isLoading && (
            <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
          )}
          {!list.isLoading && rows.length === 0 && (
            <div className="card text-center text-sm text-neutral-500">결재 건이 없습니다.</div>
          )}

          <ul className="space-y-2">
            {rows.map((row) => {
              const isActive = selected?.id === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`card w-full text-left transition ${
                      isActive
                        ? 'border-brand-500/50 bg-brand-500/5'
                        : 'hover:border-neutral-700'
                    }`}
                    onClick={() => setSelected(row)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="flex-1 truncate font-medium text-neutral-100">
                        {row.title}
                      </h3>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{row.body}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
                      <span>결재자 {row.approverIds.length}명</span>
                      <span>{new Date(row.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <aside>
          {selected ? (
            <DetailPanel
              key={selected.id}
              approval={selected}
              isRequester={selected.requesterId === me?.id}
              isApprover={!!me && selected.approverIds.includes(me.id)}
              onChanged={(next) => setSelected(next)}
            />
          ) : (
            <div className="card text-center text-xs text-neutral-500">
              목록에서 결재 건을 선택하세요.
            </div>
          )}
        </aside>
      </div>

      {composerOpen && <ApprovalFormModal onClose={() => setComposerOpen(false)} />}
    </div>
  );
}

function DetailPanel({
  approval,
  isRequester,
  isApprover,
  onChanged,
}: {
  approval: ApprovalRow;
  isRequester: boolean;
  isApprover: boolean;
  onChanged(next: ApprovalRow): void;
}) {
  const decide = useDecideApproval(approval.id);
  const cancel = useCancelApproval(approval.id);

  const canDecide = isApprover && approval.status === 'pending';
  const canCancel = isRequester && approval.status === 'pending';

  return (
    <article className="card sticky top-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="flex-1 text-base font-semibold text-neutral-100">{approval.title}</h3>
        <StatusBadge status={approval.status} />
      </div>

      <div className="mb-4 whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
        {approval.body}
      </div>

      <dl className="space-y-1 text-[11px] text-neutral-500">
        <div className="flex justify-between">
          <dt>상신일</dt>
          <dd className="text-neutral-300">
            {new Date(approval.createdAt).toLocaleString('ko-KR')}
          </dd>
        </div>
        {approval.decidedAt && (
          <div className="flex justify-between">
            <dt>결정일</dt>
            <dd className="text-neutral-300">
              {new Date(approval.decidedAt).toLocaleString('ko-KR')}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>결재자 수</dt>
          <dd className="text-neutral-300">{approval.approverIds.length}명</dd>
        </div>
      </dl>

      {(canDecide || canCancel) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-800 pt-4">
          {canDecide && (
            <>
              <button
                type="button"
                className="btn-primary"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate('approve', { onSuccess: (next) => onChanged(next) })
                }
              >
                승인
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate('reject', { onSuccess: (next) => onChanged(next) })
                }
              >
                반려
              </button>
            </>
          )}
          {canCancel && (
            <button
              type="button"
              className="btn-secondary"
              disabled={cancel.isPending}
              onClick={() =>
                cancel.mutate(undefined, { onSuccess: (next) => onChanged(next) })
              }
            >
              취소(상신 철회)
            </button>
          )}
        </div>
      )}

      {(decide.isError || cancel.isError) && (
        <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          처리에 실패했습니다.
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, string> = {
    pending: 'bg-blue-500/20 text-blue-300 ring-blue-500/40',
    approved: 'bg-green-500/20 text-green-300 ring-green-500/40',
    rejected: 'bg-red-500/20 text-red-300 ring-red-500/40',
    cancelled: 'bg-neutral-700 text-neutral-500 line-through',
  };
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${map[status]}`}
    >
      {APPROVAL_STATUS_LABELS[status]}
    </span>
  );
}
