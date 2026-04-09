import { useState } from 'react';
import { ROLES } from '@iw001/shared';
import {
  useDeleteUser,
  useResetUserPassword,
  useUsersList,
} from './api/useUsers';
import { UserFormModal } from './components/UserFormModal';
import type { UserRow } from './types';

/**
 * Users management panel — embedded in AdminPage's "계정 관리" tab.
 *
 * All writes funnel through the admin:* permission + high-severity audit
 * logs. The service also enforces a self-delete guard so an admin can't
 * accidentally lock themselves out.
 */
export function UsersPanel() {
  const [editing, setEditing] = useState<UserRow | null | 'new'>(null);
  const [banner, setBanner] = useState<
    | { kind: 'temp-password'; email: string; password: string }
    | { kind: 'error'; message: string }
    | null
  >(null);

  const list = useUsersList();
  const remove = useDeleteUser();
  const resetPw = useResetUserPassword();

  const rows = list.data ?? [];

  function onCreatedWithTempPassword(password: string, email: string) {
    setBanner({ kind: 'temp-password', email, password });
  }

  async function onResetPassword(user: UserRow) {
    if (!confirm(`"${user.name}" 의 비밀번호를 임시값으로 재설정합니다. 진행할까요?`)) {
      return;
    }
    try {
      const res = await resetPw.mutateAsync(user.id);
      setBanner({
        kind: 'temp-password',
        email: user.email,
        password: res.temporaryPassword,
      });
    } catch {
      setBanner({ kind: 'error', message: '비밀번호 재설정에 실패했습니다.' });
    }
  }

  async function onDelete(user: UserRow) {
    if (
      !confirm(
        `"${user.name}" 계정을 비활성화합니다.\n` +
          '기존 감사 로그/견적 기록은 보존되지만 더 이상 로그인할 수 없게 됩니다.\n' +
          '계속하시겠습니까?',
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync(user.id);
    } catch {
      setBanner({ kind: 'error', message: '삭제에 실패했습니다. 본인 계정은 삭제할 수 없습니다.' });
    }
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">계정 관리</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            사용자 생성·수정·비밀번호 초기화·소프트 삭제. 모든 작업은
            <span className="mx-1 text-red-400">severity=high</span>
            감사 로그로 기록됩니다.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 사용자
        </button>
      </div>

      {banner?.kind === 'temp-password' && (
        <div className="mb-4 rounded-md border border-brand-500/40 bg-brand-500/10 p-3 text-xs">
          <div className="font-semibold text-brand-300">임시 비밀번호가 발급되었습니다</div>
          <div className="mt-1 text-neutral-300">
            대상: <code className="text-neutral-100">{banner.email}</code>
          </div>
          <div className="mt-1 text-neutral-300">
            임시 비밀번호:{' '}
            <code className="rounded bg-neutral-950 px-2 py-0.5 font-mono text-brand-300">
              {banner.password}
            </code>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            이 값은 다시 볼 수 없습니다. 안전한 경로로 사용자에게 전달한 뒤 이 창을 닫으세요.
          </div>
          <button
            type="button"
            className="btn-secondary mt-2 px-3 py-1 text-xs"
            onClick={() => setBanner(null)}
          >
            확인
          </button>
        </div>
      )}

      {banner?.kind === 'error' && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {banner.message}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setBanner(null)}
          >
            닫기
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/80 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">이름</th>
              <th className="px-3 py-2 text-left">이메일</th>
              <th className="px-3 py-2 text-left">역할</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left">부서</th>
              <th className="px-3 py-2 text-left">최근 로그인</th>
              <th className="w-32 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {list.isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-xs text-neutral-500">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!list.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-xs text-neutral-500">
                  사용자가 없습니다.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="transition hover:bg-neutral-800/40">
                <td className="px-3 py-2 font-medium text-neutral-100">
                  {u.name}
                  {u.mustChangePw && (
                    <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/40">
                      비밀번호 변경 필요
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-400">{u.email}</td>
                <td className="px-3 py-2 text-xs">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-3 py-2 text-xs">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500">{u.department ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ko-KR') : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <IconButton onClick={() => setEditing(u)} title="수정">
                      ✎
                    </IconButton>
                    <IconButton
                      onClick={() => onResetPassword(u)}
                      title="비밀번호 초기화"
                      disabled={resetPw.isPending}
                    >
                      🔑
                    </IconButton>
                    <IconButton
                      tone="danger"
                      onClick={() => onDelete(u)}
                      title="비활성화"
                      disabled={remove.isPending || u.status === 'inactive'}
                    >
                      ✕
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onCreatedWithTempPassword={onCreatedWithTempPassword}
        />
      )}
    </section>
  );
}

function RoleBadge({ role }: { role: keyof typeof ROLES }) {
  const label = ROLES[role]?.label ?? role;
  const tone =
    role === 'admin'
      ? 'bg-brand-500/20 text-brand-300 ring-brand-500/40'
      : role === 'manager'
        ? 'bg-blue-500/20 text-blue-300 ring-blue-500/40'
        : role === 'engineer'
          ? 'bg-green-500/20 text-green-300 ring-green-500/40'
          : 'bg-neutral-700/50 text-neutral-300 ring-neutral-600';
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${tone}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'inactive' | 'locked' }) {
  const map = {
    active: { label: '활성', cls: 'bg-green-500/20 text-green-300' },
    inactive: { label: '비활성', cls: 'bg-neutral-700 text-neutral-500 line-through' },
    locked: { label: '잠김', cls: 'bg-red-500/20 text-red-300' },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] ${s.cls}`}>
      {s.label}
    </span>
  );
}

function IconButton({
  children,
  onClick,
  title,
  tone = 'neutral',
  disabled,
}: {
  children: React.ReactNode;
  onClick(): void;
  title: string;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
}) {
  const base =
    'h-7 w-7 rounded text-xs transition disabled:cursor-not-allowed disabled:opacity-30';
  const toneCls =
    tone === 'danger'
      ? 'text-neutral-500 hover:bg-red-500/10 hover:text-red-400'
      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100';
  return (
    <button
      type="button"
      className={`${base} ${toneCls}`}
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
