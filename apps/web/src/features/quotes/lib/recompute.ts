/**
 * Client-side preview recompute.
 *
 * This is a TypeScript port of `QuotesService.computeTotals` in apps/api.
 * Both MUST produce numerically identical results for the same input — if
 * they drift, the user would see a preview total that differs from what the
 * server saves, which is confusing and erodes trust.
 *
 * Critically, this is a PREVIEW ONLY. The server re-runs the same math
 * authoritatively when the form is submitted, and its numbers win. Never
 * send the preview totals back to the server as fact.
 */

export interface ClientLineInput {
  qty: number;
  unitPrice: number;
  discount: number; // 0..100
}

export interface ClientLineComputed extends ClientLineInput {
  lineTotal: number;
}

export interface ClientQuoteTotals {
  lines: ClientLineComputed[];
  subtotal: number;
  discountTotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

export function computeQuoteTotals(
  items: ClientLineInput[],
  vatRate: number,
): ClientQuoteTotals {
  const lines = items.map((i) => ({
    ...i,
    lineTotal: round2(i.unitPrice * i.qty * (1 - i.discount / 100)),
  }));
  const gross = lines.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const net = lines.reduce((s, i) => s + i.lineTotal, 0);
  const subtotal = round2(net);
  const discountTotal = round2(gross - net);
  const vatAmount = round2(subtotal * (vatRate / 100));
  const total = round2(subtotal + vatAmount);
  return { lines, subtotal, discountTotal, vatRate, vatAmount, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** KRW formatter used throughout the quotes UI. */
export const krw = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});
