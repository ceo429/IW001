import type { PageDef } from '@iw001/shared';
import { GROUP_LABELS } from '@iw001/shared';

/**
 * Placeholder used by routes whose feature is scheduled for Phase 2+. Every
 * spec page is already reachable through navigation; only the content is
 * pending. This keeps routing / permission tests exercisable today.
 */
export function PlaceholderPage({ page }: { page: PageDef }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          {GROUP_LABELS[page.group]}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{page.label}</h1>
      </div>
      <div className="card">
        <p className="text-sm text-neutral-400">
          이 페이지는 로드맵 Phase 2 이후에 구현됩니다. 네비게이션·권한·라우팅은
          이미 연결되어 있으며, 실제 기능 구현 시 이 자리에 feature 컴포넌트가 들어갑니다.
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          page id: <code className="text-brand-400">{page.id}</code>
        </p>
      </div>
    </div>
  );
}
