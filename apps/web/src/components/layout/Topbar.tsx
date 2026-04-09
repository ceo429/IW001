import { useUiStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/useAuth';

export function Topbar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-800 bg-neutral-900/60 px-6">
      <div className="flex items-center gap-3">
        <button type="button" className="btn-secondary px-2 py-1" onClick={toggleSidebar}>
          ☰
        </button>
        <input
          type="search"
          placeholder="검색 (기기 · 장소 · 프로젝트 · 견적 · 품목)"
          className="input w-96 max-w-full"
          aria-label="통합 검색"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-secondary px-3 py-1 text-xs"
          onClick={toggleTheme}
          aria-label="테마 전환"
        >
          {theme === 'dark' ? '🌙 다크' : '☀️ 라이트'}
        </button>
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <div className="font-medium text-neutral-100">{user.name}</div>
              <div className="text-neutral-500">{user.role}</div>
            </div>
            <button
              type="button"
              className="btn-secondary px-3 py-1 text-xs"
              onClick={() => logout.mutate()}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
