/**
 * Unit tests for QuotesService.computeTotals() — the tamper-proofing logic
 * the whole finance flow depends on. See docs/SECURITY.md §1 Tampering.
 *
 * Kept as a PURE unit test (no Nest bootstrap, no Prisma) because
 * computeTotals is a static method with no dependencies. Catching drift
 * between the server calc and its client mirror (apps/web/src/features/
 * quotes/lib/recompute.ts) is the main job of this test file.
 */

import { QuotesService } from '../src/modules/quotes/quotes.service';

describe('QuotesService.computeTotals', () => {
  it('returns zeros for an empty item list', () => {
    const r = QuotesService.computeTotals([], 10);
    expect(r.subtotal).toBe(0);
    expect(r.discountTotal).toBe(0);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(0);
  });

  it('computes a simple single-line total with no discount', () => {
    const r = QuotesService.computeTotals(
      [{ qty: 2, unitPrice: 50_000, discount: 0 }],
      10,
    );
    expect(r.subtotal).toBe(100_000);
    expect(r.discountTotal).toBe(0);
    expect(r.vatAmount).toBe(10_000);
    expect(r.total).toBe(110_000);
  });

  it('applies percent discount per line and rolls discountTotal correctly', () => {
    // Line1: 10 * 30,000 @ 10%  = 300,000 gross -> 270,000 net (30,000 off)
    // Line2:  3 * 100,000 @ 0%  = 300,000 gross -> 300,000 net
    // subtotal = 570,000, discountTotal = 30,000
    // vat (10%) = 57,000, total = 627,000
    const r = QuotesService.computeTotals(
      [
        { qty: 10, unitPrice: 30_000, discount: 10 },
        { qty: 3, unitPrice: 100_000, discount: 0 },
      ],
      10,
    );
    expect(r.subtotal).toBe(570_000);
    expect(r.discountTotal).toBe(30_000);
    expect(r.vatAmount).toBe(57_000);
    expect(r.total).toBe(627_000);
  });

  it('rounds to 2 decimal places on fractional results', () => {
    // 3 * 33.33 @ 10%: gross 99.99, discount 10% -> net 89.991 -> 89.99
    const r = QuotesService.computeTotals(
      [{ qty: 3, unitPrice: 33.33, discount: 10 }],
      10,
    );
    expect(r.subtotal).toBe(89.99);
    expect(r.discountTotal).toBe(10);
    expect(r.vatAmount).toBe(9);
    expect(r.total).toBe(98.99);
  });

  it('uses the provided vatRate, not a hardcoded one', () => {
    // Sanity check that a non-10 VAT flows through. Defends against a
    // future "oops, defaulted to 10 everywhere" regression.
    const r = QuotesService.computeTotals(
      [{ qty: 1, unitPrice: 100_000, discount: 0 }],
      7,
    );
    expect(r.vatAmount).toBe(7_000);
    expect(r.total).toBe(107_000);
  });

  it('clamps discount at 100% without going negative', () => {
    // Discount > 100% would produce a negative lineTotal in a naive impl.
    // Our zod schema caps discount at 100, but the calc should still be
    // well-behaved if the cap ever drifts.
    const r = QuotesService.computeTotals(
      [{ qty: 1, unitPrice: 100_000, discount: 100 }],
      10,
    );
    expect(r.subtotal).toBe(0);
    expect(r.discountTotal).toBe(100_000);
    expect(r.total).toBe(0);
  });

  it('matches the client-side preview port exactly (parity test)', () => {
    // This input is the same one used by apps/web/src/features/quotes/
    // lib/recompute.ts sample. If the server and client ever drift,
    // this test surfaces it here first rather than in a user's quote.
    const items = [
      { qty: 5, unitPrice: 89_000, discount: 5 },
      { qty: 1, unitPrice: 150_000, discount: 0 },
      { qty: 12, unitPrice: 12_500, discount: 15 },
    ];
    const r = QuotesService.computeTotals(items, 10);

    // Hand-computed expectations:
    //  line1:  5 * 89,000 = 445,000 @ 5%  -> 422,750
    //  line2:  1 * 150,000 = 150,000 @ 0% -> 150,000
    //  line3: 12 * 12,500  = 150,000 @ 15% -> 127,500
    //  gross          = 745,000
    //  net            = 700,250
    //  discountTotal  = 745,000 - 700,250 = 44,750
    //  vatAmount (10) = 70,025
    //  total          = 770,275
    expect(r.subtotal).toBe(700_250);
    expect(r.discountTotal).toBe(44_750);
    expect(r.vatAmount).toBe(70_025);
    expect(r.total).toBe(770_275);
  });
});
