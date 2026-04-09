import { useMemo, useState } from 'react';
import { GROUP_LABELS, GROUP_ORDER, PAGES, ROLES, ROLE_IDS } from '@iw001/shared';
import type { RoleId } from '@iw001/shared';
import { usePermissions, useUpdatePermissions } from '../api/usePermissions';
import type { PermissionAction, PermissionChangePayload, PermissionRow } from '../types';

/**
 * The permission matrix editor.
 *
 * REMINDER — this is a UX tool. The real authority is the DB row checked by
 * PermissionsGuard on every request; a user with console access could flip
 * a checkbox in React DevTools and still see nothing change server-side.
 *
 * Editing flow:
 *   1. Load the full matrix (roles × pages × actions) via GET /permissions
 *   2. User toggles in a local draft (unsaved changes badge appears)
 *   3. On save, we diff draft vs fetched and PATCH only the changed rows
 *   4. The server writes an audit-log entry (severity: high) automatically
 */
export function PermissionMatrix() {
  const { data: fetched, isLoading } = usePermissions();
  const update = useUpdatePermissions();

  // Draft is stored as Map<"role:pageId", row> for O(1) lookup + mutation.
  const [draft, setDraft] = useState<Map<string, PermissionRow> | null>(null);

  // Seed draft when data first arrives.
  const effectiveDraft = useMemo(() => {
    if (draft) return draft;
    if (!fetched) return null;
    const m = new Map<string, PermissionRow>();
    for (const row of fetched) m.set(`${row.role}:${row.pageId}`, row);
    return m;
  }, [draft, fetched]);

  if (isLoading || !effectiveDraft) {
    return <div className="card text-sm text-neutral-500">매트릭스 불러오는 중…</div>;
  }

  function toggle(role: RoleId, pageId: string, action: PermissionAction) {
    if (!effectiveDraft) return;
    const key = `${role}:${pageId}`;
    const cur = effectiveDraft.get(key);
    if (!cur) return;
    const next = new Map(effectiveDraft);
    next.set(key, { ...cur, [action]: !cur[action] });
    setDraft(next);
  }

  const changes: PermissionChangePayload[] = [];
  if (fetched && effectiveDraft) {
    for (const orig of fetched) {
      const key = `${orig.role}:${orig.pageId}`;
      const now = effectiveDraft.get(key);
      if (!now) continue;
      if (
        now.canRead !== orig.canRead ||
        now.canWrite !== orig.canWrite ||
        now.canDelete !== orig.canDelete
      ) {
        changes.push({
          role: orig.role,
          pageId: orig.pageId,
          canRead: now.canRead,
          canWrite: now.canWrite,
          canDelete: now.canDelete,
        });
      }
    }
  }

  function save() {
    if (changes.length === 0) return;
    update.mutate(changes, {
      onSuccess: () => setDraft(null),
    });
  }

  function reset() {
    setDraft(null);
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">권한 매트릭스</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            역할별로 각 페이지의 읽기(R) / 쓰기(W) / 삭제(D) 권한을 설정합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {changes.length > 0 && (
            <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-300 ring-1 ring-brand-500/40">
              {changes.length}건 변경
            </span>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={reset}
            disabled={changes.length === 0 || update.isPending}
          >
            되돌리기
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={save}
            disabled={changes.length === 0 || update.isPending}
          >
            {update.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {update.isError && (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          저장에 실패했습니다. 관리자 권한이 필요합니다.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-xs">
          <thead className="bg-neutral-900 text-[11px] uppercase text-neutral-500">
            <tr>
              <th className="sticky left-0 z-10 bg-neutral-900 px-3 py-2 text-left">
                페이지
              </th>
              {ROLE_IDS.map((role) => (
                <th key={role} colSpan={3} className="border-l border-neutral-800 px-2 py-2">
                  {ROLES[role].label}
                </th>
              ))}
            </tr>
            <tr className="text-[10px] text-neutral-600">
              <th className="sticky left-0 z-10 bg-neutral-900 px-3 py-1 text-left" />
              {ROLE_IDS.map((role) => (
                <TripleHeader key={role} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {GROUP_ORDER.flatMap((groupId) => {
              const pagesInGroup = PAGES.filter((p) => p.group === groupId);
              return [
                <tr key={`group-${groupId}`} className="bg-neutral-950/80">
                  <td
                    colSpan={1 + ROLE_IDS.length * 3}
                    className="sticky left-0 bg-neutral-950/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
                  >
                    {GROUP_LABELS[groupId]}
                  </td>
                </tr>,
                ...pagesInGroup.map((page) => (
                  <tr key={page.id} className="hover:bg-neutral-900/40">
                    <td className="sticky left-0 bg-inherit px-3 py-2 text-neutral-200">
                      {page.label}
                    </td>
                    {ROLE_IDS.map((role) => {
                      const row = effectiveDraft.get(`${role}:${page.id}`);
                      if (!row) {
                        return (
                          <td
                            key={role}
                            colSpan={3}
                            className="border-l border-neutral-800 px-2 py-2 text-center text-neutral-700"
                          >
                            —
                          </td>
                        );
                      }
                      return (
                        <TripleCell
                          key={role}
                          row={row}
                          onToggle={(action) => toggle(role, page.id, action)}
                        />
                      );
                    })}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-neutral-500">
        모든 변경은 감사 로그에 <code>severity=high</code> 로 기록됩니다. 최고관리자는
        이 매트릭스를 우회해 항상 모든 권한을 가집니다.
      </p>
    </section>
  );
}

function TripleHeader() {
  return (
    <>
      <th className="border-l border-neutral-800 px-1 py-1 text-center">R</th>
      <th className="px-1 py-1 text-center">W</th>
      <th className="px-1 py-1 text-center">D</th>
    </>
  );
}

function TripleCell({
  row,
  onToggle,
}: {
  row: PermissionRow;
  onToggle(action: PermissionAction): void;
}) {
  return (
    <>
      <Cell checked={row.canRead} onToggle={() => onToggle('canRead')} tone="neutral" />
      <Cell checked={row.canWrite} onToggle={() => onToggle('canWrite')} tone="brand" />
      <Cell checked={row.canDelete} onToggle={() => onToggle('canDelete')} tone="danger" />
    </>
  );
}

function Cell({
  checked,
  onToggle,
  tone,
}: {
  checked: boolean;
  onToggle(): void;
  tone: 'neutral' | 'brand' | 'danger';
}) {
  const activeBg =
    tone === 'brand'
      ? 'bg-brand-500/30 text-brand-300'
      : tone === 'danger'
        ? 'bg-red-500/30 text-red-300'
        : 'bg-neutral-700/60 text-neutral-200';

  return (
    <td className="border-l border-neutral-800 px-1 py-1 text-center">
      <button
        type="button"
        className={`h-5 w-5 rounded text-[11px] ${
          checked
            ? activeBg
            : 'bg-neutral-900 text-neutral-700 hover:bg-neutral-800'
        }`}
        onClick={onToggle}
        aria-pressed={checked}
      >
        {checked ? '✓' : ''}
      </button>
    </td>
  );
}
