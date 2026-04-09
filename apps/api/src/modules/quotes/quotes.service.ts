import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  canTransition,
  type CreateQuoteDto,
  type ListQuotesQuery,
  type QuoteItemInput,
  type QuoteStatus,
  type UpdateQuoteDto,
} from '@iw001/shared';

/**
 * Quote service.
 *
 * SECURITY NOTE — the single most important rule in this service:
 *   We IGNORE any `lineTotal`, `subtotal`, `vatAmount`, `total` the client
 *   sends. We pull `unitPrice` from the product catalog (if linked) and
 *   recompute every number server-side. This is the concrete defense
 *   against tampered quote amounts (docs/SECURITY.md §1 Tampering).
 */
@Injectable()
export class QuotesService {
  private static readonly DEFAULT_VAT_RATE = 10;

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  async list(query: ListQuotesQuery) {
    const { page, pageSize, status, customerId, q } = query;

    const where: Prisma.QuoteWhereInput = {
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(q && {
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { note: { contains: q, mode: 'insensitive' } },
          { customer: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          home: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        customer: true,
        home: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!quote) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '견적서를 찾을 수 없습니다.' },
      });
    }
    return quote;
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(createdById: string, dto: CreateQuoteDto) {
    const resolvedItems = await this.resolveItems(dto.items);
    const calc = this.recompute(resolvedItems, QuotesService.DEFAULT_VAT_RATE);
    const code = await this.generateCode();

    return this.prisma.$transaction(async (tx) => {
      return tx.quote.create({
        data: {
          code,
          customerId: dto.customerId,
          homeId: dto.homeId ?? null,
          templateId: dto.templateId,
          validUntil: new Date(dto.validUntil),
          subtotal: calc.subtotal,
          discountTotal: calc.discountTotal,
          vatRate: calc.vatRate,
          vatAmount: calc.vatAmount,
          total: calc.total,
          note: dto.note ?? null,
          attrs: (dto.attrs ?? {}) as Prisma.InputJsonValue,
          createdById,
          items: {
            create: resolvedItems.map((it, idx) => ({
              productId: it.productId ?? null,
              name: it.name,
              model: it.model ?? null,
              unit: it.unit,
              qty: it.qty,
              unitPrice: it.unitPrice,
              discount: it.discount,
              lineTotal: it.lineTotal,
              sortOrder: it.sortOrder ?? idx,
            })),
          },
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  async update(id: string, dto: UpdateQuoteDto) {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '견적서를 찾을 수 없습니다.' },
      });
    }

    // Only drafts (or rejected, which can go back to draft) may be edited.
    if (existing.status !== 'draft' && existing.status !== 'rejected') {
      throw new BadRequestException({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: '발송 후에는 견적서를 수정할 수 없습니다. 복제 후 편집하세요.',
        },
      });
    }

    const items = dto.items;
    const resolvedItems = items ? await this.resolveItems(items) : null;
    const calc = resolvedItems
      ? this.recompute(resolvedItems, Number(existing.vatRate))
      : null;

    return this.prisma.$transaction(async (tx) => {
      // Replace items wholesale when the caller sends `items`. Simpler than
      // diffing and safe because quote items belong to exactly one quote.
      if (resolvedItems) {
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
      }

      return tx.quote.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          homeId: dto.homeId,
          templateId: dto.templateId,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          note: dto.note,
          attrs: dto.attrs as Prisma.InputJsonValue | undefined,
          ...(calc && {
            subtotal: calc.subtotal,
            discountTotal: calc.discountTotal,
            vatAmount: calc.vatAmount,
            total: calc.total,
          }),
          ...(resolvedItems && {
            items: {
              create: resolvedItems.map((it, idx) => ({
                productId: it.productId ?? null,
                name: it.name,
                model: it.model ?? null,
                unit: it.unit,
                qty: it.qty,
                unitPrice: it.unitPrice,
                discount: it.discount,
                lineTotal: it.lineTotal,
                sortOrder: it.sortOrder ?? idx,
              })),
            },
          }),
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // State transition — server is the authority
  // ---------------------------------------------------------------------------

  async transition(id: string, to: QuoteStatus) {
    const existing = await this.prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '견적서를 찾을 수 없습니다.' },
      });
    }
    if (!canTransition(existing.status as QuoteStatus, to)) {
      throw new BadRequestException({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: `상태 전이 불가: ${existing.status} → ${to}`,
        },
      });
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: to },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // ---------------------------------------------------------------------------
  // Calculation engine (pure, unit-testable)
  // ---------------------------------------------------------------------------

  /**
   * For each line: if `productId` is set, OVERWRITE `unitPrice` with the
   * current catalog price. This prevents the client from sending an old/low
   * price for a product that just got a price bump.
   */
  private async resolveItems(items: QuoteItemInput[]) {
    const productIds = items
      .map((i) => i.productId)
      .filter((x): x is string => typeof x === 'string');

    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, unitPrice: true, name: true, model: true, unit: true },
        })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    return items.map((it, idx) => {
      const p = it.productId ? byId.get(it.productId) : undefined;
      const unitPrice = p ? Number(p.unitPrice) : it.unitPrice;
      const name = p ? p.name : it.name;
      const model = p ? (p.model ?? undefined) : it.model;
      const unit = p ? p.unit : it.unit;
      const lineTotal = round2(unitPrice * it.qty * (1 - it.discount / 100));
      return {
        ...it,
        unitPrice,
        name,
        model,
        unit,
        lineTotal,
        sortOrder: it.sortOrder ?? idx,
      };
    });
  }

  /**
   * Pure function — exposed as a static member so the controller layer and
   * unit tests can call it directly without instantiating the service. The
   * frontend has its own port of this (used for live preview only); the two
   * MUST stay numerically identical. See apps/web/src/features/quotes/lib/recompute.ts.
   */
  static computeTotals(
    items: Array<{ qty: number; unitPrice: number; discount: number }>,
    vatRate: number,
  ) {
    const itemsWithLine = items.map((i) => ({
      ...i,
      lineTotal: round2(i.unitPrice * i.qty * (1 - i.discount / 100)),
    }));
    const gross = itemsWithLine.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const net = itemsWithLine.reduce((s, i) => s + i.lineTotal, 0);
    const subtotal = round2(net);
    const discountTotal = round2(gross - net);
    const vatAmount = round2(subtotal * (vatRate / 100));
    const total = round2(subtotal + vatAmount);
    return { itemsWithLine, subtotal, discountTotal, vatRate, vatAmount, total };
  }

  private recompute(
    items: Array<{ qty: number; unitPrice: number; discount: number; lineTotal: number }>,
    vatRate: number,
  ) {
    return QuotesService.computeTotals(items, vatRate);
  }

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.quote.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `QT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
