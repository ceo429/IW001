import { useEffect, useState, type FormEvent } from 'react';
import {
  createMaintenanceJobSchema,
  DEFAULT_MAINTENANCE_CHECKLIST,
  type ChecklistItem,
  type CreateMaintenanceJobDto,
} from '@iw001/shared';
import { useCreateMaintenanceJob } from '../api/useMaintenance';
import { useHomesList } from '@/features/homes/api/useHomes';

/**
 * Create-only modal for a new maintenance job. Edit of existing jobs
 * happens inline via the checklist toggles on MaintenancePage — there's
 * no "edit the whole job" flow for Phase 1.
 */
export function MaintenanceFormModal({ onClose }: { onClose(): void }) {
  const homes = useHomesList({ filter: 'all' });
  const create = useCreateMaintenanceJob();

  const [homeId, setHomeId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16); // datetime-local format
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    DEFAULT_MAINTENANCE_CHECKLIST.map((label) => ({ label, done: false })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dto: CreateMaintenanceJobDto = {
      homeId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      checklist: checklist.filter((c) => c.label.trim().length > 0),
    };
    const parsed = createMaintenanceJobSchema.safeParse(dto);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join('.') || '_root'] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    create.mutate(parsed.data, { onSuccess: onClose });
  }

  function patchItem(index: number, label: string) {
    setChecklist((c) => c.map((item, i) => (i === index ? { ...item, label } : item)));
  }
  function removeItem(index: number) {
    setChecklist((c) => c.filter((_, i) => i !== index));
  }
  function addItem() {
    setChecklist((c) => [...c, { label: '', done: false }]);
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
        noValidate
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">새 유지보수 일정</h2>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-200"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="home">
              장소 *
            </label>
            <select
              id="home"
              className="input"
              value={homeId}
              onChange={(e) => setHomeId(e.target.value)}
              required
            >
              <option value="">— 선택 —</option>
              {homes.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.customer.name})
                </option>
              ))}
            </select>
            {errors.homeId && <p className="mt-1 text-xs text-red-400">{errors.homeId}</p>}
          </div>

          <div>
            <label className="label" htmlFor="scheduledAt">
              예정일시 *
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              className="input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
            {errors.scheduledAt && (
              <p className="mt-1 text-xs text-red-400">{errors.scheduledAt}</p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label">점검 항목 *</label>
              <button
                type="button"
                className="text-[10px] text-brand-400 hover:underline"
                onClick={addItem}
              >
                + 항목 추가
              </button>
            </div>
            <ul className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-600">{i + 1}.</span>
                  <input
                    className="input !py-1 text-xs"
                    value={item.label}
                    onChange={(e) => patchItem(i, e.target.value)}
                    placeholder="점검 항목"
                  />
                  <button
                    type="button"
                    className="text-neutral-600 hover:text-red-400"
                    onClick={() => removeItem(i)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {errors.checklist && (
              <p className="mt-1 text-xs text-red-400">{errors.checklist}</p>
            )}
          </div>
        </div>

        {create.isError && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            저장에 실패했습니다.
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
