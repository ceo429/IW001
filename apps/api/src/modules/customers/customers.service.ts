import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Minimal customer read model for the quote editor's customer picker.
 * Full CRUD lives in Phase 2 (see docs/ROADMAP.md §2.4).
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  listForPicker() {
    return this.prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        ceoName: true,
        bizNo: true,
        phone: true,
        discountRate: true,
      },
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ceoName: true,
        bizNo: true,
        phone: true,
        email: true,
        address: true,
        discountRate: true,
      },
    });
  }
}
