import { NavLink } from 'react-router-dom';
import { PAGES, GROUP_LABELS, GROUP_ORDER, type PageDef } from '@iw001/shared';
import { useUiStore } from '@/store/ui.store';

/**
 * Sidebar navigation. Renders the 7 spec groups and lets users pin favorites.
 * Favorite state lives in `ui.store` and is persisted to localStorage.
 */
export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const favorites = useUiStore((s) => s.favorites);
  const toggleFavorite = useUiStore((s) => s.toggleFavorite);

  const byGroup = new Map<string, PageDef[]>();
  for (const p of PAGES) {
    if (!byGroup.has(p.group)) byGroup.set(p.group, []);
    byGroup.get(p.group)!.push(p);
  }

  const favPages = favorites
    .map((id) => PAGES.find((p) => p.id === id))
    .filter((p): p is PageDef => !!p);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } flex shrink-0 flex-col border-r border-neutral-800 bg-neutral-900/70 transition-all`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-neutral-800 px-4">
        <div className="h-7 w-7 rounded-lg bg-brand-500" aria-hidden />
        {!collapsed && <span className="text-sm font-bold tracking-tight">IOTWORKS DESK</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 text-sm">
        {favPages.length > 0 && (
          <NavGroupBlock title={collapsed ? '★' : '★ 즐겨찾기'} collapsed={collapsed}>
            {favPages.map((p) => (
              <NavItem
                key={p.id}
                page={p}
                collapsed={collapsed}
                isFavorite
                onToggleFavorite={() => toggleFavorite(p.id)}
              />
            ))}
          </NavGroupBlock>
        )}

        {GROUP_ORDER.map((groupId) => {
          const pages = byGroup.get(groupId) ?? [];
          if (pages.length === 0) return null;
          return (
            <NavGroupBlock
              key={groupId}
              title={collapsed ? GROUP_LABELS[groupId].slice(0, 1) : GROUP_LABELS[groupId]}
              collapsed={collapsed}
            >
              {pages.map((p) => (
                <NavItem
                  key={p.id}
                  page={p}
                  collapsed={collapsed}
                  isFavorite={favorites.includes(p.id)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                />
              ))}
            </NavGroupBlock>
          );
        })}
      </nav>
    </aside>
  );
}

function NavGroupBlock({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div
        className={`mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 ${
          collapsed ? 'text-center' : ''
        }`}
      >
        {title}
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavItem({
  page,
  collapsed,
  isFavorite,
  onToggleFavorite,
}: {
  page: PageDef;
  collapsed: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <li className="group relative">
      <NavLink
        to={`/${page.id}`}
        className={({ isActive }) =>
          `flex items-center gap-2 rounded-lg px-3 py-2 transition ${
            isActive
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
          }`
        }
      >
        <span
          className="inline-block h-5 w-5 flex-shrink-0 rounded bg-brand-500/20"
          aria-hidden
          title={page.icon}
        />
        {!collapsed && <span className="flex-1 truncate">{page.label}</span>}
      </NavLink>
      {!collapsed && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 text-xs text-neutral-500 hover:text-brand-400 group-hover:block"
        >
          {isFavorite ? '★' : '☆'}
        </button>
      )}
    </li>
  );
}
