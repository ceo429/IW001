import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateAccountDto, UpdateAccountDto } from '@iw001/shared';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all accounts with a home-count. The page groups by `period`
   * client-side — there's no benefit to doing the grouping here because
   * there are only ever a few dozen accounts in total.
   */
  list() {
    return this.prisma.account.findMany({
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { homes: true } },
      },
      orderBy: [{ period: 'desc' }, { email: 'asc' }],
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        customer: true,
        homes: { select: { id: true, name: true } },
      },
    });
    if (!account) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '계정을 찾을 수 없습니다.' },
      });
    }
    return account;
  }

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        email: dto.email,
        period: dto.period,
        tokenStatus: dto.tokenStatus,
        tokenExpiresAt: dto.tokenExpiresAt ? new Date(dto.tokenExpiresAt) : null,
        customerId: dto.customerId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: {
        email: dto.email,
        period: dto.period,
        tokenStatus: dto.tokenStatus,
        tokenExpiresAt: dto.tokenExpiresAt ? new Date(dto.tokenExpiresAt) : undefined,
        customerId: dto.customerId,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Home.accountId is nullable; deleting an account leaves homes orphaned
    // but intact. The quote/maintenance history still resolves via homes.
    await this.prisma.account.delete({ where: { id } });
    return { id };
  }
}
