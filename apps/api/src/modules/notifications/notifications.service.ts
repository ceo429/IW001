import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotifSeverity as PrismaSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateNotificationDto, NotifSeverity } from '@iw001/shared';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns user-scoped + broadcast notifications, most-recent first.
   * Broadcasts are rows where userId IS NULL — the service unions them
   * so a user sees both their personal alerts and org-wide ones in one
   * stream.
   */
  list(
    userId: string,
    filter: { unreadOnly?: boolean; severity?: NotifSeverity },
  ) {
    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId }, { userId: null }],
      ...(filter.unreadOnly && { read: false }),
      ...(filter.severity && { severity: filter.severity as PrismaSeverity }),
    };
    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        OR: [{ userId }, { userId: null }],
        read: false,
      },
    });
    return { count };
  }

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId ?? null,
        title: dto.title,
        body: dto.body,
        severity: dto.severity as PrismaSeverity,
      },
    });
  }

  async markRead(id: string) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다.' },
      });
    }
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Bulk mark-read for one user. Broadcasts are NOT flipped because a
   * broadcast read by one user shouldn't disappear for everyone else —
   * proper "per-user read state" for broadcasts would need a join table
   * (deferred to Phase 3).
   */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { updated: result.count };
  }

  async remove(id: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { id };
  }
}
