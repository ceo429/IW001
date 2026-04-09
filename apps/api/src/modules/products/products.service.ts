import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Product catalog — GET list only for Phase 1. Full CRUD (stock, minStock,
 * supplier) lands in Phase 2 (docs/ROADMAP.md §2.3).
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string) {
    return this.prisma.product.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { model: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take: 200,
    });
  }
}
