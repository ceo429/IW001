import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateQuoteDto, QuoteItemInput } from '@iw001/shared';

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

  list() {
    return this.prisma.quote.findMany({
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } }, customer: true, home: true },
    });
    if (!quote) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: '견적서를 찾을 수 없습니다.' } });
    return quote;
  }

  async create(createdById: string, dto: CreateQuoteDto) {
    const resolvedItems = await this.resolveItems(dto.items);
    const calc = this.recompute(resolvedItems, QuotesService.DEFAULT_VAT_RATE);

    const code = await this.generateCode();

    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
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

      return quote;
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

  private recompute(
    items: Array<{ qty: number; unitPrice: number; discount: number; lineTotal: number }>,
    vatRate: number,
  ) {
    const gross = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const net = items.reduce((s, i) => s + i.lineTotal, 0);
    const subtotal = round2(net);
    const discountTotal = round2(gross - net);
    const vatAmount = round2(subtotal * (vatRate / 100));
    const total = round2(subtotal + vatAmount);
    return { subtotal, discountTotal, vatRate, vatAmount, total };
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
