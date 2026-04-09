import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHomesList, useHomesOverview } from './api/useHomes';

/**
 * 장소별 현황 — card grid of every IoT home with online-rate indicator.
 * Cards link to a detail page (placeholder for Phase 2).
 */
export function HomeStatusPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'offline'>('all');

  const overview = useHomesOverview();
  const list = useHomesList({ q: q.trim() || undefined, filter });

  const rows = list.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-500">모니터링</div>
        <h1 className="mt-1 text-2xl font-bold">장소별 현황</h1>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="전체 장소" value={String(overview.data?.siteCount ?? '—')} />
        <Kpi label="총 기기" value={String(overview.data?.deviceCount ?? '—')} />
        <Kpi label="온라인" value={String(overview.data?.onlineCount ?? '—')} />
        <Kpi
          label="온라인율"
          value={overview.data ? `${overview.data.onlineRate}%` : '—'}
          warning={(overview.data?.onlineRate ?? 100) < 95}
        />
      </section>

      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={chip(filter === 'all')}
          onClick={() => setFilter('all')}
        >
          전체
        </button>
        <button
          type="button"
          className={chip(filter === 'offline')}
          onClick={() => setFilter('offline')}
        >
          오프라인 있음
        </button>
        <div className="ml-auto w-64">
          <input
            type="search"
            className="input"
            placeholder="장소명·주소·고객사 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && rows.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">장소가 없습니다.</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((home) => (
          <HomeCard key={home.id} home={home} />
        ))}
      </div>
    </div>
  );
}

function HomeCard({
  home,
}: {
  home: {
    id: string;
    name: string;
    address: string | null;
    customer: { id: string; name: string };
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    onlineRate: number;
  };
}) {
  const rate = home.onlineRate;
  const hasOffline = home.offlineDevices > 0;
  const borderTone = hasOffline
    ? 'border-red-500/40 ring-1 ring-red-500/20'
    : rate >= 95
      ? 'border-neutral-800'
      : 'border-amber-500/40 ring-1 ring-amber-500/20';

  return (
    <Link
      to={`/home-status`}
      className={`card block transition hover:border-brand-500/50 ${borderTone}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-100">{home.name}</h3>
          <div className="mt-0.5 text-xs text-neutral-500">{home.customer.name}</div>
        </div>
        <RateBadge rate={rate} />
      </div>

      {home.address && (
        <div className="mt-2 truncate text-xs text-neutral-500">{home.address}</div>
      )}

      <div className="mt-4">
        <Bar onlineRate={rate} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Stat label="전체" value={home.totalDevices} />
        <Stat label="온라인" value={home.onlineDevices} tone="good" />
        <Stat label="오프라인" value={home.offlineDevices} tone={hasOffline ? 'bad' : 'mute'} />
      </dl>
    </Link>
  );
}

function RateBadge({ rate }: { rate: number }) {
  const tone =
    rate >= 95
      ? 'bg-green-500/20 text-green-300 ring-green-500/40'
      : rate >= 80
        ? 'bg-amber-500/20 text-amber-300 ring-amber-500/40'
        : 'bg-red-500/20 text-red-300 ring-red-500/40';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${tone}`}
    >
      {rate}%
    </span>
  );
}

function Bar({ onlineRate }: { onlineRate: number }) {
  const color =
    onlineRate >= 95 ? 'bg-green-500' : onlineRate >= 80 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${Math.max(0, Math.min(100, onlineRate))}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'mute',
}: {
  label: string;
  value: number;
  tone?: 'good' | 'bad' | 'mute';
}) {
  const color =
    tone === 'good'
      ? 'text-green-400'
      : tone === 'bad'
        ? 'text-red-400'
        : 'text-neutral-300';
  return (
    <div className="rounded border border-neutral-800 bg-neutral-950/50 p-2 text-center">
      <div className="text-[10px] uppercase text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${color}`}>{value}</div>
    </div>
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
          warning ? 'text-amber-400' : 'text-brand-400'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function chip(active: boolean): string {
  return `rounded-md px-3 py-1 text-xs transition ${
    active
      ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40'
      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
  }`;
}
