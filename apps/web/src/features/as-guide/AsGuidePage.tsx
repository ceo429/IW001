import { useState } from 'react';
import { DEVICE_TYPE_LABELS, type GuideDeviceType } from '@iw001/shared';
import {
  useAsGuidesList,
  useDeleteAsGuide,
  useIncrementAsGuideCase,
} from './api/useAsGuides';
import { AsGuideFormModal } from './components/AsGuideFormModal';
import type { AsGuideRow } from './types';

const DEVICE_TYPES: GuideDeviceType[] = [
  'switch',
  'hub',
  'plug',
  'sensor',
  'dc',
  'media',
  'etc',
];

export function AsGuidePage() {
  const [deviceType, setDeviceType] = useState<GuideDeviceType | ''>('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AsGuideRow | null | 'new'>(null);

  const list = useAsGuidesList({
    q: q.trim() || undefined,
    deviceType: deviceType || undefined,
  });
  const remove = useDeleteAsGuide();
  const increment = useIncrementAsGuideCase();

  const rows = list.data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">관리</div>
          <h1 className="mt-1 text-2xl font-bold">AS 가이드</h1>
          <p className="mt-1 text-xs text-neutral-500">
            기기 유형별 증상 → 원인 → 조치 지식베이스입니다. 현장에서 맞는
            가이드를 찾으면 "사례 +1" 을 눌러 사례 수를 누적해 주세요.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 가이드
        </button>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={chip(deviceType === '')}
            onClick={() => setDeviceType('')}
          >
            전체
          </button>
          {DEVICE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={chip(deviceType === t)}
              onClick={() => setDeviceType(t)}
            >
              {DEVICE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="ml-auto w-72">
          <input
            type="search"
            className="input"
            placeholder="증상·원인·조치 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && rows.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          조건에 맞는 가이드가 없습니다.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <GuideCard
            key={row.id}
            row={row}
            onEdit={() => setEditing(row)}
            onDelete={() => {
              if (confirm('가이드를 삭제하시겠습니까?')) remove.mutate(row.id);
            }}
            onIncrement={() => increment.mutate(row.id)}
          />
        ))}
      </div>

      {editing !== null && (
        <AsGuideFormModal
          guide={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function GuideCard({
  row,
  onEdit,
  onDelete,
  onIncrement,
}: {
  row: AsGuideRow;
  onEdit(): void;
  onDelete(): void;
  onIncrement(): void;
}) {
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-medium text-brand-300 ring-1 ring-brand-500/40">
          {DEVICE_TYPE_LABELS[row.deviceType as GuideDeviceType] ?? row.deviceType}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-[10px] text-neutral-500 hover:text-brand-400"
            onClick={onIncrement}
            title="이 가이드로 해결된 사례 +1"
          >
            사례 {row.caseCount} · +1
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            onClick={onEdit}
          >
            수정
          </button>
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      </div>

      <Section label="증상" tone="red" text={row.symptom} />
      <Section label="원인" tone="amber" text={row.rootCause} />
      <Section label="조치" tone="green" text={row.action} />
      {row.tips && <Section label="팁" tone="blue" text={row.tips} />}
    </article>
  );
}

function Section({
  label,
  tone,
  text,
}: {
  label: string;
  tone: 'red' | 'amber' | 'green' | 'blue';
  text: string;
}) {
  const borderColor =
    tone === 'red'
      ? 'border-l-red-500'
      : tone === 'amber'
        ? 'border-l-amber-500'
        : tone === 'green'
          ? 'border-l-green-500'
          : 'border-l-blue-500';
  return (
    <div className={`mt-3 border-l-2 ${borderColor} pl-3`}>
      <div className="text-[10px] font-semibold uppercase text-neutral-500">{label}</div>
      <p className="mt-0.5 whitespace-pre-wrap text-xs text-neutral-200">{text}</p>
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
