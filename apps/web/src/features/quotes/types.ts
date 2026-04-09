import type { QuoteStatus } from '@iw001/shared';

/**
 * UI-side row type. Values from the API arrive as strings for Decimal columns
 * (Prisma returns `Decimal` which axios deserializes as string), so we store
 * them as `number` after a Number() conversion at the query boundary.
 */
export interface QuoteRow {
  id: string;
  code: string;
  status: QuoteStatus;
  templateId: string;
  issuedAt: string;
  validUntil: string;
  subtotal: number;
  discountTotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  note: string | null;
  customer: { id: string; name: string };
  home: { id: string; name: string } | null;
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItemRow {
  id: string;
  productId: string | null;
  name: string;
  model: string | null;
  unit: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  sortOrder: number;
}

export interface QuoteDetail extends QuoteRow {
  items: QuoteItemRow[];
  customer: {
    id: string;
    name: string;
    ceoName: string | null;
    bizNo: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } & { id: string; name: string };
  attrs: Record<string, string> | null;
}

export interface CustomerPick {
  id: string;
  name: string;
  ceoName: string | null;
  bizNo: string | null;
  phone: string | null;
  discountRate: number;
}

export interface ProductPick {
  id: string;
  category: string;
  name: string;
  model: string | null;
  unit: string;
  unitPrice: number;
  stock: number;
}

/**
 * Draft shape used by the editor. Slightly different from the DTO sent to
 * the server because the editor can hold un-saved, partially-filled rows.
 */
export interface QuoteEditorDraft {
  customerId: string;
  homeId: string;
  templateId: 'tpl-standard' | 'tpl-simple' | 'tpl-detail' | 'tpl-tax';
  validUntil: string; // yyyy-mm-dd
  note: string;
  items: Array<{
    productId: string | null;
    name: string;
    model: string;
    unit: string;
    qty: number;
    unitPrice: number;
    discount: number;
  }>;
}
