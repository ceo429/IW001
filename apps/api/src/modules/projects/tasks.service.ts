import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateTaskDto, UpdateTaskDto } from '@iw001/shared';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });
    if (!task) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '태스크를 찾을 수 없습니다.' },
      });
    }
    return task;
  }

  async create(projectId: string, dto: CreateTaskDto) {
    // Make sure the project exists before we try to attach a task.
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '프로젝트를 찾을 수 없습니다.' },
      });
    }
    return this.prisma.task.create({
      data: {
        projectId,
        title: dto.title,
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId ?? null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });
  }

  async move(id: string, to: ProjectStatus) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: { status: to },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.task.delete({ where: { id } });
    return { id };
  }
}
