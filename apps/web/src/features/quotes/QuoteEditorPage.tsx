import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createQuoteSchema, type CreateQuoteDto } from '@iw001/shared';
import { useCustomersForPicker } from './api/usePickers';
import { useCreateQuote, useQuoteDetail, useUpdateQuote } from './api/useQuotes';
import { QuoteItemsEditor } from './components/QuoteItemsEditor';
import { QuoteSummary } from './components/QuoteSummary';
import { computeQuoteTotals } from './lib/recompute';
import type { QuoteEditorDraft } from './types';

const DEFAULT_VAT_RATE = 10;

const EMPTY_DRAFT: QuoteEditorDraft = {
  customerId: '',
  homeId: '',
  templateId: 'tpl-standard',
  validUntil: isoDate(addDays(new Date(), 14)),
  note: '',
  items: [],
};

/**
 * Quote editor.
 *
 * Handles BOTH create and edit: if `id` is present in the URL, we load the
 * existing quote and pre-fill the draft; otherwise we start from EMPTY_DRAFT.
 * On submit we POST or PATCH accordingly.
 *
 * All live totals are PREVIEW ONLY (computeQuoteTotals). The server
 * recomputes authoritatively and its response replaces the draft totals.
 */
export function QuoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [draft, setDraft] = useState<QuoteEditorDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const existing = useQuoteDetail(id);
  const customers = useCustomersForPicker();
  const create = useCreateQuote();
  const update = useUpdateQuote(id ?? '');

  // When editing, hydrate the draft from the fetched quote (once).
  useEffect(() => {
    if (!isEdit || !existing.data) return;
    const q = existing.data;
    setDraft({
      customerId: q.customer.id,
      homeId: q.home?.id ?? '',
      templateId: (q.templateId as QuoteEditorDraft['templateId']) ?? 'tpl-standard',
      validUntil: isoDate(new Date(q.validUntil)),
      note: q.note ?? '',
      items: q.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        model: i.model ?? '',
        unit: i.unit,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
    });
  }, [isEdit, existing.data]);

  const totals = useMemo(
    () =>
      computeQuoteTotals(
        draft.items.map((i) => ({
          qty: i.qty,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        DEFAULT_VAT_RATE,
      ),
    [draft.items],
  );

  function setField<K extends keyof QuoteEditorDraft>(key: K, value: QuoteEditorDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function buildDto(): CreateQuoteDto | null {
    const dto: CreateQuoteDto = {
      customerId: draft.customerId,
      homeId: draft.homeId || undefined,
      templateId: draft.templateId,
      validUntil: new Date(draft.validUntil).toISOString(),
      note: draft.note || undefined,
      items: draft.items.map((i) => ({
        productId: i.productId ?? undefined,
        name: i.name,
        model: i.model || undefined,
        unit: i.unit,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
    };
    const parsed = createQuoteSchema.safeParse(dto);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fe[issue.path.join('.') || '_root'] = issue.message;
      }
      setErrors(fe);
      return null;
    }
    setErrors({});
    return parsed.data;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dto = buildDto();
    if (!dto) return;

    if (isEdit && id) {
      update.mutate(dto, { onSuccess: (saved) => navigate(`/quotes/${saved.id}`) });
    } else {
      create.mutate(dto, { onSuccess: (saved) => navigate(`/quotes/${saved.id}`) });
    }
  }

  if (isEdit && existing.isLoading) {
    return <div className="text-sm text-neutral-500">불러오는 중…</div>;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-6xl" noValidate>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/quotes" className="text-xs text-neutral-500 hover:text-brand-400">
            ← 견적서 목록
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {isEdit ? '견적서 수정' : '새 견적서'}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/quotes')}
          >
            취소
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={create.isPending || update.isPending}
          >
            {create.isPending || update.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-3 text-sm font-semibold text-neutral-300">기본 정보</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="customer">
                  고객사 *
                </label>
                <select
                  id="customer"
                  className="input"
                  value={draft.customerId}
                  onChange={(e) => setField('customerId', e.target.value)}
                  required
                >
                  <option value="">— 선택 —</option>
                  {customers.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="mt-1 text-xs text-red-400">{errors.customerId}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="template">
                  양식
                </label>
                <select
                  id="template"
                  className="input"
                  value={draft.templateId}
                  onChange={(e) =>
                    setField('templateId', e.target.value as QuoteEditorDraft['templateId'])
                  }
                >
                  <option value="tpl-standard">표준 견적서</option>
                  <option value="tpl-simple">간이 견적서</option>
                  <option value="tpl-detail">상세 견적서</option>
                  <option value="tpl-tax">세금계산서형</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="validUntil">
                  유효기간 *
                </label>
                <input
                  id="validUntil"
                  type="date"
                  className="input"
                  value={draft.validUntil}
                  onChange={(e) => setField('validUntil', e.target.value)}
                  required
                />
                {errors.validUntil && (
                  <p className="mt-1 text-xs text-red-400">{errors.validUntil}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="note">
                  메모
                </label>
                <textarea
                  id="note"
                  className="input min-h-[70px]"
                  value={draft.note}
                  onChange={(e) => setField('note', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="card">
            <QuoteItemsEditor
              items={draft.items}
              onChange={(items) => setDraft((d) => ({ ...d, items }))}
            />
            {errors.items && (
              <p className="mt-2 text-xs text-red-400">{errors.items}</p>
            )}
          </section>

          {(create.isError || update.isError) && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              저장에 실패했습니다. 입력값과 권한을 확인하세요.
            </div>
          )}
        </div>

        <div>
          <QuoteSummary totals={totals} />
        </div>
      </div>
    </form>
  );
}

// ---- helpers --------------------------------------------------------------

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
