import { useMemo, useState } from 'react';
import { useAuditFacets, useAuditLogs } from './api/useAuditLogs';
import type { AuditLogRow, AuditQueryParams } from './types';

/**
 * Admin-only audit log viewer. Reads the append-only AuditLog table that
 * every mutation endpoint writes to via AuditInterceptor.
 *
 * Nothing here mutates state — it's a pure read surface. Still runs inside
 * the same permission gate so only admin:read-capable users ever see it.
 */
export function AuditLogPage() {
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState<'all' | 'normal' | 'high'>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [expanded, setExpanded] = useState<string | null>(null);

  const facets = useAuditFacets();

  const query = useMemo<AuditQueryParams>(
    () => ({
      page,
      pageSize,
      resource: resource || undefined,
      action: action || undefined,
      severity: severity === 'all' ? undefined : severity,
      q: q.trim() || undefined,
    }),
    [page, resource, action, severity, q],
  );

  const logs = useAuditLogs(query);
  const rows = logs.data?.data ?? [];
  const pagination = logs.data?.pagination;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500">시스템</div>
        <h1 className="mt-1 text-2xl font-bold">감사 로그</h1>
        <p className="mt-1 text-xs text-neutral-500">
          모든 쓰기 API 호출은 <code className="text-brand-400">AuditInterceptor</code>가
          자동으로 이 테이블에 기록합니다. 권한 변경·삭제는{' '}
          <span className="text-red-400">severity=high</span>로 표시됩니다.
        </p>
      </div>

      <div className="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="sm:col-span-1">
          <label className="label">리소스</label>
          <select
            className="input"
            value={resource}
            onChange={(e) => {
              setResource(e.target.value);
              setPage(1);
            }}
          >
            <option value="">전체</option>
            {(facets.data?.resources ?? []).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="label">액션</label>
          <select
            className="input"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">전체</option>
            {(facets.data?.actions ?? []).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="label">심각도</label>
          <select
            className="input"
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value as 'all' | 'normal' | 'high');
              setPage(1);
            }}
          >
            <option value="all">전체</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">검색 (리소스 ID·경로)</label>
          <input
            type="search"
            className="input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-xs">
          <thead className="bg-neutral-900/80 text-[10px] uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">시각</th>
              <th className="px-3 py-2 text-left">사용자</th>
              <th className="px-3 py-2 text-left">리소스</th>
              <th className="px-3 py-2 text-left">액션</th>
              <th className="px-3 py-2 text-left">경로</th>
              <th className="px-3 py-2 text-left">심각도</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900">
            {logs.isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-neutral-500">
                  불러오는 중…
                </td>
              </tr>
            )}
            {!logs.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-neutral-500">
                  조건에 맞는 로그가 없습니다.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <Row
                key={row.id}
                row={row}
                expanded={expanded === row.id}
                onToggle={() => setExpanded(expanded === row.id ? null : row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <div>
            총 {pagination.total.toLocaleString('ko-KR')}건 · {pagination.page} /{' '}
            {pagination.pageCount}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1 text-xs"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1 text-xs"
              disabled={pagination.page >= pagination.pageCount}
              onClick={() => setPage((p) => Math.min(pagination.pageCount, p + 1))}
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  row,
  expanded,
  onToggle,
}: {
  row: AuditLogRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer transition hover:bg-neutral-900/40 ${
          row.severity === 'high' ? 'bg-red-500/5' : ''
        }`}
        onClick={onToggle}
      >
        <td className="px-3 py-2 font-mono text-neutral-400">
          {formatTs(row.createdAt)}
        </td>
        <td className="px-3 py-2">
          {row.user ? (
            <div>
              <div className="text-neutral-100">{row.user.name}</div>
              <div className="text-[10px] text-neutral-500">{row.user.email}</div>
            </div>
          ) : (
            <span className="text-neutral-600">— anonymous —</span>
          )}
        </td>
        <td className="px-3 py-2 text-neutral-300">{row.resource}</td>
        <td className="px-3 py-2">
          <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">
            {row.action}
          </span>
        </td>
        <td className="px-3 py-2 font-mono text-[11px] text-neutral-500">
          <span className="mr-1 inline-block rounded bg-neutral-800 px-1 text-[9px] text-neutral-400">
            {row.method}
          </span>
          {row.path}
        </td>
        <td className="px-3 py-2">
          {row.severity === 'high' ? (
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300 ring-1 ring-red-500/40">
              high
            </span>
          ) : (
            <span className="text-neutral-600">normal</span>
          )}
        </td>
        <td className="px-2 py-2 text-center text-neutral-600">
          {expanded ? '▲' : '▼'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-neutral-950">
          <td colSpan={7} className="px-4 py-3 text-[11px]">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
              <Dt>IP</Dt>
              <Dd>{row.ip}</Dd>
              <Dt>User-Agent</Dt>
              <Dd className="truncate">{row.userAgent}</Dd>
              <Dt>Resource ID</Dt>
              <Dd className="font-mono">{row.resourceId ?? '—'}</Dd>
              <Dt>Role</Dt>
              <Dd>{row.user?.role ?? '—'}</Dd>
            </dl>
            {row.after !== null && row.after !== undefined && (
              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase text-neutral-500">
                  after (response snapshot)
                </div>
                <pre className="max-h-48 overflow-auto rounded border border-neutral-800 bg-neutral-950 p-2 text-[10px] text-neutral-300">
                  {safeStringify(row.after)}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-neutral-500">{children}</dt>;
}
function Dd({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dd className={`text-neutral-300 ${className}`}>{children}</dd>;
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString('ko-KR', { hour12: false })
    );
  } catch {
    return iso;
  }
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
