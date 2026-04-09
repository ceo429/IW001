import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditQuery {
  page: number;
  pageSize: number;
  userId?: string;
  resource?: string;
  action?: string;
  severity?: 'normal' | 'high';
  /** ISO date — inclusive lower bound. */
  from?: string;
  /** ISO date — exclusive upper bound. */
  to?: string;
  /** Free-text match against resourceId / path. */
  q?: string;
}

/**
 * Read-only access to the AuditLog table. Admin-only at the controller
 * layer — this service deliberately does not export any create/update/delete.
 */
@Injectable()
export class AuditReadService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQuery) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.userId && { userId: query.userId }),
      ...(query.resource && { resource: query.resource }),
      ...(query.action && { action: query.action }),
      ...(query.severity && { severity: query.severity }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lt: new Date(query.to) }),
        },
      }),
      ...(query.q && {
        OR: [
          { resourceId: { contains: query.q } },
          { path: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: rows,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  /** Distinct resource/action values for filter dropdowns. */
  async facets() {
    const [resources, actions] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        select: { resource: true },
        distinct: ['resource'],
        orderBy: { resource: 'asc' },
      }),
      this.prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
    ]);
    return {
      resources: resources.map((r) => r.resource),
      actions: actions.map((a) => a.action),
    };
  }
}
