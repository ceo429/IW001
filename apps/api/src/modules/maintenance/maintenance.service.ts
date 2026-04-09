import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  ChecklistItem,
  CreateMaintenanceJobDto,
  UpdateMaintenanceJobDto,
} from '@iw001/shared';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `scope` splits the schedule into future vs past vs everything, which
   * is how the UI tabs render. We do the split in SQL instead of pulling
   * all rows because a typical org accumulates years of history.
   */
  list(scope: 'upcoming' | 'past' | 'all', homeId?: string) {
    const now = new Date();
    const scheduledFilter: Prisma.MaintenanceJobWhereInput =
      scope === 'upcoming'
        ? { scheduledAt: { gte: now }, done: false }
        : scope === 'past'
          ? { OR: [{ scheduledAt: { lt: now } }, { done: true }] }
          : {};
    return this.prisma.maintenanceJob.findMany({
      where: {
        ...scheduledFilter,
        ...(homeId && { homeId }),
      },
      include: {
        home: {
          select: {
            id: true,
            name: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { scheduledAt: scope === 'past' ? 'desc' : 'asc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.maintenanceJob.findUnique({
      where: { id },
      include: {
        home: {
          include: { customer: { select: { id: true, name: true } } },
        },
      },
    });
    if (!job) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '유지보수 일정을 찾을 수 없습니다.' },
      });
    }
    return job;
  }

  create(dto: CreateMaintenanceJobDto) {
    return this.prisma.maintenanceJob.create({
      data: {
        homeId: dto.homeId,
        scheduledAt: new Date(dto.scheduledAt),
        checklist: dto.checklist as unknown as Prisma.InputJsonValue,
        engineerId: dto.engineerId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateMaintenanceJobDto) {
    await this.findOne(id);
    return this.prisma.maintenanceJob.update({
      where: { id },
      data: {
        homeId: dto.homeId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        checklist: dto.checklist
          ? (dto.checklist as unknown as Prisma.InputJsonValue)
          : undefined,
        engineerId: dto.engineerId,
      },
    });
  }

  /**
   * Toggle a single checklist item at position `index`. Reads the JSON,
   * mutates the one item, writes it back. The whole thing runs inside a
   * single update — Prisma doesn't support JSON path mutations.
   */
  async toggleChecklist(id: string, index: number, done: boolean) {
    const job = await this.findOne(id);
    const checklist = (job.checklist as ChecklistItem[]) ?? [];
    if (index < 0 || index >= checklist.length) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '체크리스트 항목을 찾을 수 없습니다.' },
      });
    }
    const nextChecklist = checklist.map((item, i) =>
      i === index ? { ...item, done } : item,
    );
    const allDone = nextChecklist.every((i) => i.done);
    return this.prisma.maintenanceJob.update({
      where: { id },
      data: {
        checklist: nextChecklist as unknown as Prisma.InputJsonValue,
        done: allDone,
        doneAt: allDone ? new Date() : null,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.maintenanceJob.delete({ where: { id } });
    return { id };
  }
}
