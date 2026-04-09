import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateAsGuideDto, UpdateAsGuideDto } from '@iw001/shared';

@Injectable()
export class AsGuidesService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string, deviceType?: string) {
    const where: Prisma.AsGuideEntryWhereInput = {
      ...(deviceType && { deviceType }),
      ...(q && {
        OR: [
          { symptom: { contains: q, mode: 'insensitive' } },
          { rootCause: { contains: q, mode: 'insensitive' } },
          { action: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.asGuideEntry.findMany({
      where,
      orderBy: [{ caseCount: 'desc' }, { updatedAt: 'desc' }],
      take: 300,
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.asGuideEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '가이드를 찾을 수 없습니다.' },
      });
    }
    return entry;
  }

  create(dto: CreateAsGuideDto) {
    return this.prisma.asGuideEntry.create({
      data: {
        deviceType: dto.deviceType,
        symptom: dto.symptom,
        rootCause: dto.rootCause,
        action: dto.action,
        tips: dto.tips ?? null,
        caseCount: dto.caseCount ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateAsGuideDto) {
    await this.findOne(id);
    return this.prisma.asGuideEntry.update({
      where: { id },
      data: {
        deviceType: dto.deviceType,
        symptom: dto.symptom,
        rootCause: dto.rootCause,
        action: dto.action,
        tips: dto.tips,
        caseCount: dto.caseCount,
      },
    });
  }

  /** Bump case count by 1 — used when an engineer flags "this matched". */
  async incrementCaseCount(id: string) {
    await this.findOne(id);
    return this.prisma.asGuideEntry.update({
      where: { id },
      data: { caseCount: { increment: 1 } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.asGuideEntry.delete({ where: { id } });
    return { id };
  }
}
