import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateProjectDto, UpdateProjectDto } from '@iw001/shared';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: ProjectStatus, customerId?: string) {
    return this.prisma.project.findMany({
      where: {
        ...(status && { status }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
        },
      },
    });
    if (!project) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '프로젝트를 찾을 수 없습니다.' },
      });
    }
    return project;
  }

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        title: dto.title,
        status: dto.status,
        priority: dto.priority,
        customerId: dto.customerId ?? null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status,
        priority: dto.priority,
        customerId: dto.customerId,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Task.projectId has onDelete: Cascade, so deleting a project also
    // drops its tasks. This is intended for drafts and cancelled work.
    await this.prisma.project.delete({ where: { id } });
    return { id };
  }
}
