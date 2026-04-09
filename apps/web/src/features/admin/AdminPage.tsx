import { useState } from 'react';
import { PermissionMatrix } from './components/PermissionMatrix';

/**
 * Admin page with 3 tabs per 개발기획서 §4.7.3:
 *   - API 연결 관리
 *   - 섹션 권한 관리  (← THE permission matrix editor, the real feature)
 *   - 계정 관리
 *
 * Phase 1 ships the permission matrix because it's the single highest-
 * impact admin surface — it's the knob that controls RBAC for all other
 * pages. The other two tabs stay as stubs until Phase 2.
 */

type Tab = 'permissions' | 'api' | 'accounts';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'permissions', label: '섹션 권한 관리', icon: '🛡️' },
  { id: 'api', label: 'API 연결 관리', icon: '🔌' },
  { id: 'accounts', label: '계정 관리', icon: '👤' },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('permissions');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500">시스템</div>
        <h1 className="mt-1 text-2xl font-bold">관리자 설정</h1>
      </div>

      <nav className="mb-4 flex gap-1 border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-200'
            }`}
          >
            <span aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {tab === 'permissions' && <PermissionMatrix />}
      {tab === 'api' && <StubPanel title="API 연결 관리" />}
      {tab === 'accounts' && <StubPanel title="계정 관리" />}
    </div>
  );
}

function StubPanel({ title }: { title: string }) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
      <p className="mt-2 text-xs text-neutral-500">
        이 탭은 Phase 2에서 구현됩니다. 관련 백엔드 엔드포인트와 컨트롤러는
        <code className="text-brand-400"> apps/api/src/modules/users </code>에
        이미 준비되어 있으며, UI만 붙이면 됩니다.
      </p>
    </div>
  );
}
