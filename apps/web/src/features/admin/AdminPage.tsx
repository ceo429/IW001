import { useState } from 'react';
import { PermissionMatrix } from './components/PermissionMatrix';
import { UsersPanel } from '@/features/users/UsersPanel';

/**
 * Admin page with 3 tabs per 개발기획서 §4.7.3:
 *   - 섹션 권한 관리  (permission matrix)
 *   - API 연결 관리   (Phase 2)
 *   - 계정 관리       (user CRUD)
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
      {tab === 'accounts' && <UsersPanel />}
    </div>
  );
}

function StubPanel({ title }: { title: string }) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
      <p className="mt-2 text-xs text-neutral-500">
        이 탭은 Phase 2에서 구현됩니다. 장소별 API 연결(REST/MQTT/WebSocket)
        설정과 연결 테스트 UI가 추가될 예정입니다.
      </p>
    </div>
  );
}
