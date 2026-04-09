import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateProductDto, UpdateProductDto } from '@iw001/shared';

/**
 * Product catalog. Full CRUD now — list-only was shipped earlier for the
 * quote editor's picker. Write operations are admin/manager only
 * (enforced at the controller layer).
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string, category?: string) {
    return this.prisma.product.findMany({
      where: {
        ...(q && {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
          ],
        }),
        ...(category && { category }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 500,
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '품목을 찾을 수 없습니다.' },
      });
    }
    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        category: dto.category,
        name: dto.name,
        model: dto.model ?? null,
        unit: dto.unit,
        unitPrice: dto.unitPrice,
        stock: dto.stock,
        minStock: dto.minStock,
        supplier: dto.supplier ?? null,
        description: dto.description ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id); // 404 if missing
    return this.prisma.product.update({
      where: { id },
      data: {
        category: dto.category,
        name: dto.name,
        model: dto.model,
        unit: dto.unit,
        unitPrice: dto.unitPrice,
        stock: dto.stock,
        minStock: dto.minStock,
        supplier: dto.supplier,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Deleting a product that is referenced by QuoteItem would leave the
    // quote line with productId = null (schema default). That is the
    // intended behavior — historical quotes should survive catalog cleanup.
    await this.prisma.product.delete({ where: { id } });
    return { id };
  }

  /** KPI-style aggregate for the products page header. */
  async overview() {
    const [total, agg, lowStockRows, byCategory] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.aggregate({ _sum: { stock: true } }),
      // Prisma's findMany does not cleanly support column-vs-column comparison
      // on non-postgres drivers, so we use a tiny raw query.
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "Product" WHERE "stock" <= "minStock"
      `,
      this.prisma.product.groupBy({ by: ['category'], _count: { _all: true } }),
    ]);

    return {
      total,
      totalStock: agg._sum.stock ?? 0,
      lowStock: Number(lowStockRows[0]?.count ?? 0),
      categoryCount: byCategory.length,
      byCategory: byCategory.map((g) => ({ category: g.category, count: g._count._all })),
    };
  }
}
