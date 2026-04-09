import { z } from 'zod';
import { idSchema, moneySchema, percentSchema } from './common.js';

/**
 * Quote (견적서) schemas. These enforce the same shape on the wire (web -> api)
 * and are also used server-side to re-validate before the server RECOMPUTES
 * line totals, subtotal, VAT, and total — client-sent totals are always
 * discarded on write. See docs/API.md §6.
 */

export const quoteTemplateIdSchema = z.enum([
  'tpl-standard',
  'tpl-simple',
  'tpl-detail',
  'tpl-tax',
]);
export type QuoteTemplateId = z.infer<typeof quoteTemplateIdSchema>;

export const quoteItemInputSchema = z
  .object({
    /** Present when the line references a catalog product. */
    productId: idSchema.optional(),
    /** Free-text name when no catalog product is linked (installs, custom work). */
    name: z.string().min(1).max(200),
    model: z.string().max(120).optional(),
    unit: z.string().min(1).max(20).default('EA'),
    qty: z.number().int().positive().max(100_000),
    unitPrice: moneySchema,
    discount: percentSchema.default(0),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine((v) => v.productId || v.name.trim().length > 0, {
    message: '품목 ID 또는 이름이 필요합니다.',
    path: ['name'],
  });
export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>;

export const createQuoteSchema = z.object({
  customerId: idSchema,
  homeId: idSchema.optional(),
  templateId: quoteTemplateIdSchema.default('tpl-standard'),
  validUntil: z.string().datetime('올바른 ISO 날짜가 아닙니다.'),
  items: z.array(quoteItemInputSchema).min(1, '품목을 1개 이상 입력하세요.').max(500),
  note: z.string().max(2000).optional(),
  attrs: z
    .object({
      supplierName: z.string().max(200).optional(),
      supplierBizNo: z.string().max(30).optional(),
      supplierCeo: z.string().max(80).optional(),
      supplierAddr: z.string().max(300).optional(),
      supplierTel: z.string().max(30).optional(),
      recipientBizNo: z.string().max(30).optional(),
      recipientCeo: z.string().max(80).optional(),
      recipientAddr: z.string().max(300).optional(),
      recipientTel: z.string().max(30).optional(),
      deliveryTerms: z.string().max(500).optional(),
      paymentTerms: z.string().max(500).optional(),
      bankAccount: z.string().max(200).optional(),
    })
    .optional(),
});
export type CreateQuoteDto = z.infer<typeof createQuoteSchema>;

export const updateQuoteSchema = createQuoteSchema.partial();
export type UpdateQuoteDto = z.infer<typeof updateQuoteSchema>;

export const quoteStatusSchema = z.enum([
  'draft',
  'sent',
  'approved',
  'rejected',
  'ordered',
  'cancelled',
]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

/** Query parameters for GET /quotes list. */
export const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: quoteStatusSchema.optional(),
  customerId: idSchema.optional(),
  /** Free-text match against code / customer name / note. */
  q: z.string().max(120).optional(),
});
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;

/**
 * State transitions map. Enforced on the server to prevent illegal moves
 * (e.g. ordered -> draft). Frontend uses it only to gray out buttons.
 */
export const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['approved', 'rejected', 'cancelled'],
  approved: ['ordered', 'cancelled'],
  rejected: ['draft', 'cancelled'],
  ordered: [],
  cancelled: [],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return QUOTE_STATUS_TRANSITIONS[from].includes(to);
}

/** Body for POST /quotes/:id/transition { to: QuoteStatus }. */
export const transitionQuoteSchema = z.object({
  to: quoteStatusSchema,
  reason: z.string().max(500).optional(),
});
export type TransitionQuoteDto = z.infer<typeof transitionQuoteSchema>;
