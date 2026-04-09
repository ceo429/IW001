import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateCustomerDto, UpdateCustomerDto } from '@iw001/shared';

/**
 * Customers — full CRUD + counts for the customers page. The picker query
 * kept its own name (`listForPicker`) so the quote editor stays stable.
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

  /** Full list with quote and home counts, used on the customers page. */
  listWithCounts(q?: string) {
    return this.prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { ceoName: { contains: q, mode: 'insensitive' } },
              { bizNo: { contains: q } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { homes: true, quotes: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { homes: true, quotes: true } } },
    });
    if (!customer) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '고객사를 찾을 수 없습니다.' },
      });
    }
    return customer;
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        name: dto.name,
        ceoName: dto.ceoName ?? null,
        bizNo: dto.bizNo || null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        discountRate: dto.discountRate ?? 0,
        note: dto.note ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const data: Prisma.CustomerUpdateInput = {
      name: dto.name,
      ceoName: dto.ceoName,
      bizNo: dto.bizNo,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      note: dto.note,
    };
    if (dto.discountRate !== undefined) {
      data.discountRate = dto.discountRate;
    }
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Schema uses onDelete: Restrict for Quote.customerId, so a customer with
    // outstanding quotes cannot be deleted. Surface that as a friendly 409
    // instead of letting Prisma throw a raw foreign-key error.
    const outstanding = await this.prisma.quote.count({ where: { customerId: id } });
    if (outstanding > 0) {
      throw new NotFoundException({
        error: {
          code: 'CONFLICT',
          message: `이 고객사는 ${outstanding}건의 견적서가 연결되어 있어 삭제할 수 없습니다.`,
        },
      });
    }
    await this.prisma.customer.delete({ where: { id } });
    return { id };
  }
}
