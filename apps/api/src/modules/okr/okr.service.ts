import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CreateKeyResultDto,
  CreateObjectiveDto,
  UpdateKeyResultDto,
  UpdateObjectiveDto,
} from '@iw001/shared';

@Injectable()
export class OkrService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- objectives ---------------------------------------------------------

  async listObjectives(period?: string) {
    const objectives = await this.prisma.okrObjective.findMany({
      where: period ? { period } : undefined,
      include: {
        keyResults: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ period: 'desc' }, { createdAt: 'asc' }],
    });
    // Attach derived "overall progress" = average of key result progress.
    // We compute it server-side (never trust a client value) but expose it
    // as a read-only field on the wire.
    return objectives.map((o) => ({
      ...o,
      progress: deriveProgress(o.keyResults),
    }));
  }

  async findOne(id: string) {
    const objective = await this.prisma.okrObjective.findUnique({
      where: { id },
      include: { keyResults: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!objective) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '목표를 찾을 수 없습니다.' },
      });
    }
    return {
      ...objective,
      progress: deriveProgress(objective.keyResults),
    };
  }

  createObjective(dto: CreateObjectiveDto) {
    return this.prisma.okrObjective.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        period: dto.period,
        ownerId: dto.ownerId ?? null,
      },
      include: { keyResults: true },
    });
  }

  async updateObjective(id: string, dto: UpdateObjectiveDto) {
    await this.findOne(id);
    return this.prisma.okrObjective.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        period: dto.period,
        ownerId: dto.ownerId,
      },
      include: { keyResults: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async removeObjective(id: string) {
    await this.findOne(id);
    // keyResults cascade via the schema relation
    await this.prisma.okrObjective.delete({ where: { id } });
    return { id };
  }

  // ---- key results --------------------------------------------------------

  async addKeyResult(objectiveId: string, dto: CreateKeyResultDto) {
    const objective = await this.prisma.okrObjective.findUnique({
      where: { id: objectiveId },
      select: { id: true, _count: { select: { keyResults: true } } },
    });
    if (!objective) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '목표를 찾을 수 없습니다.' },
      });
    }
    return this.prisma.okrKeyResult.create({
      data: {
        objectiveId,
        title: dto.title,
        progress: dto.progress,
        sortOrder: objective._count.keyResults,
      },
    });
  }

  async updateKeyResult(id: string, dto: UpdateKeyResultDto) {
    const existing = await this.prisma.okrKeyResult.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '핵심결과를 찾을 수 없습니다.' },
      });
    }
    return this.prisma.okrKeyResult.update({
      where: { id },
      data: {
        title: dto.title,
        progress: dto.progress,
      },
    });
  }

  async removeKeyResult(id: string) {
    await this.prisma.okrKeyResult.delete({ where: { id } });
    return { id };
  }
}

/**
 * Objective progress is the unweighted average of its key results, rounded
 * down to the nearest integer. If an objective has zero key results it is
 * reported as 0 (the UI shows a dashed placeholder).
 */
function deriveProgress(keyResults: Array<{ progress: number }>): number {
  if (keyResults.length === 0) return 0;
  const sum = keyResults.reduce((s, kr) => s + kr.progress, 0);
  return Math.floor(sum / keyResults.length);
}
