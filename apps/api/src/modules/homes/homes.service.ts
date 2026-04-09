import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Homes (IoT 장소) — the data behind the "장소별 현황" monitoring page.
 *
 * The page shows one card per home with total / online / offline device
 * counts and an online-rate percentage. Computing those counts in a single
 * grouped query is much cheaper than N+1 per card.
 */
@Injectable()
export class HomesService {
  constructor(private readonly prisma: PrismaService) {}

  async listWithStatus(q?: string, filter?: 'all' | 'offline') {
    const homes = await this.prisma.home.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { address: { contains: q, mode: 'insensitive' } },
              { customer: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { devices: true } },
      },
      orderBy: { name: 'asc' },
      take: 500,
    });

    if (homes.length === 0) return [];

    // Pull online counts per home in one grouped query.
    const onlineCounts = await this.prisma.device.groupBy({
      by: ['homeId'],
      where: { homeId: { in: homes.map((h) => h.id) }, online: true },
      _count: { _all: true },
    });
    const onlineByHome = new Map<string, number>();
    for (const g of onlineCounts) onlineByHome.set(g.homeId, g._count._all);

    const rows = homes.map((h) => {
      const total = h._count.devices;
      const online = onlineByHome.get(h.id) ?? 0;
      const offline = total - online;
      const onlineRate = total === 0 ? 0 : Math.round((online / total) * 1000) / 10;
      return {
        id: h.id,
        name: h.name,
        address: h.address,
        customer: h.customer,
        totalDevices: total,
        onlineDevices: online,
        offlineDevices: offline,
        onlineRate,
      };
    });

    if (filter === 'offline') {
      return rows.filter((r) => r.offlineDevices > 0 || r.totalDevices === 0);
    }
    return rows;
  }

  async findOne(id: string) {
    const home = await this.prisma.home.findUnique({
      where: { id },
      include: {
        customer: true,
        devices: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            externalId: true,
            name: true,
            category: true,
            model: true,
            online: true,
            battery: true,
            lastSeenAt: true,
          },
        },
        _count: { select: { devices: true, asTickets: true, maintenanceJobs: true } },
      },
    });
    if (!home) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '장소를 찾을 수 없습니다.' },
      });
    }
    const online = home.devices.filter((d) => d.online).length;
    const total = home.devices.length;
    return {
      ...home,
      onlineDevices: online,
      offlineDevices: total - online,
      onlineRate: total === 0 ? 0 : Math.round((online / total) * 1000) / 10,
    };
  }

  /** Top-level monitoring KPIs consumed by the dashboard. */
  async overview() {
    const [siteCount, deviceCount, onlineCount] = await Promise.all([
      this.prisma.home.count(),
      this.prisma.device.count(),
      this.prisma.device.count({ where: { online: true } }),
    ]);
    const onlineRate =
      deviceCount === 0 ? 0 : Math.round((onlineCount / deviceCount) * 1000) / 10;
    return { siteCount, deviceCount, onlineCount, onlineRate };
  }
}
