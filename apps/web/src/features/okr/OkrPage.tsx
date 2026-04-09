import { useState } from 'react';
import { currentOkrPeriods } from '@iw001/shared';
import {
  useAddKeyResult,
  useDeleteKeyResult,
  useDeleteObjective,
  useObjectivesList,
  useUpdateKeyResult,
} from './api/useOkr';
import { ObjectiveFormModal } from './components/ObjectiveFormModal';
import type { KeyResultRow, ObjectiveRow } from './types';

/**
 * OKR & KPI page. A quarter picker drives the list query; each objective
 * is a card with its key results listed below, each key result has an
 * inline progress slider (0-100) with optimistic cache updates.
 */
export function OkrPage() {
  const [period, setPeriod] = useState<string>(currentOkrPeriods()[0]!);
  const [editing, setEditing] = useState<ObjectiveRow | null | 'new'>(null);

  const list = useObjectivesList(period);
  const removeObjective = useDeleteObjective();

  const objectives = list.data ?? [];

  const averageProgress =
    objectives.length === 0
      ? 0
      : Math.floor(
          objectives.reduce((s, o) => s + o.progress, 0) / objectives.length,
        );

  // Show the current quarter + previous two + next three in the picker.
  const upcoming = currentOkrPeriods();
  const offerings = Array.from(
    new Set([...previousQuarters(2), ...upcoming, period]),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">분석</div>
          <h1 className="mt-1 text-2xl font-bold">OKR & KPI</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          + 새 목표
        </button>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500">분기</label>
          <select
            className="input !py-1"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {offerings.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-neutral-400">
          <span>목표 {objectives.length}개</span>
          <span>•</span>
          <span>
            전체 진행률{' '}
            <span className="text-brand-400">{averageProgress}%</span>
          </span>
        </div>
      </div>

      {list.isLoading && (
        <div className="card text-center text-sm text-neutral-500">불러오는 중…</div>
      )}

      {!list.isLoading && objectives.length === 0 && (
        <div className="card text-center text-sm text-neutral-500">
          {period} 분기 목표가 없습니다. 오른쪽 상단에서 추가하세요.
        </div>
      )}

      <div className="space-y-4">
        {objectives.map((objective) => (
          <ObjectiveCard
            key={objective.id}
            objective={objective}
            onEdit={() => setEditing(objective)}
            onDelete={() => {
              if (confirm(`"${objective.title}" 목표를 삭제하시겠습니까?`)) {
                removeObjective.mutate(objective.id);
              }
            }}
          />
        ))}
      </div>

      {editing !== null && (
        <ObjectiveFormModal
          objective={editing === 'new' ? null : editing}
          defaultPeriod={period}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ObjectiveCard({
  objective,
  onEdit,
  onDelete,
}: {
  objective: ObjectiveRow;
  onEdit(): void;
  onDelete(): void;
}) {
  const addKr = useAddKeyResult(objective.id);
  const updateKr = useUpdateKeyResult();
  const removeKr = useDeleteKeyResult();

  const [newTitle, setNewTitle] = useState('');

  function submitNew() {
    const title = newTitle.trim();
    if (!title) return;
    addKr.mutate({ title, progress: 0 }, { onSuccess: () => setNewTitle('') });
  }

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-100">{objective.title}</h3>
          {objective.description && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-400">
              {objective.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-neutral-500">진행률</div>
            <div className="text-xl font-bold text-brand-400">{objective.progress}%</div>
          </div>
          <div className="flex flex-col gap-1">
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
              삭제
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={objective.progress} />
      </div>

      <ul className="mt-4 space-y-2 border-t border-neutral-800 pt-4">
        {objective.keyResults.length === 0 && (
          <li className="text-[11px] text-neutral-600">아직 핵심결과가 없습니다.</li>
        )}
        {objective.keyResults.map((kr) => (
          <KeyResultRowUI
            key={kr.id}
            kr={kr}
            onChange={(progress) =>
              updateKr.mutate({ id: kr.id, dto: { progress } })
            }
            onDelete={() => removeKr.mutate(kr.id)}
          />
        ))}
      </ul>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitNew();
        }}
      >
        <input
          className="input !py-1 text-xs"
          placeholder="새 핵심결과 제목"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button
          type="submit"
          className="rounded bg-brand-500 px-3 py-1 text-[10px] font-medium text-neutral-950 hover:bg-brand-400 disabled:opacity-50"
          disabled={addKr.isPending || newTitle.trim().length === 0}
        >
          + 추가
        </button>
      </form>
    </article>
  );
}

function KeyResultRowUI({
  kr,
  onChange,
  onDelete,
}: {
  kr: KeyResultRow;
  onChange(progress: number): void;
  onDelete(): void;
}) {
  return (
    <li className="rounded-md border border-neutral-800 bg-neutral-950/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-200">
          {kr.title}
        </span>
        <span className="w-10 text-right text-xs font-mono tabular-nums text-brand-400">
          {kr.progress}%
        </span>
        <button
          type="button"
          className="text-neutral-600 hover:text-red-400"
          onClick={onDelete}
          aria-label="삭제"
        >
          ✕
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={kr.progress}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand-500"
      />
    </li>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-green-500' : value >= 40 ? 'bg-brand-500' : 'bg-red-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** The previous N quarter labels, newest first. */
function previousQuarters(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  for (let i = 0; i < n; i++) {
    q--;
    if (q < 1) {
      q = 4;
      y--;
    }
    out.push(`${y}Q${q}`);
  }
  return out;
}
