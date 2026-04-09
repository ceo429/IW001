import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateAnnouncementDto, UpdateAnnouncementDto } from '@iw001/shared';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pinned items float to the top regardless of publish date, then
   * everything else sorts newest-first.
   */
  list() {
    return this.prisma.announcement.findMany({
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      take: 200,
    });
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '공지를 찾을 수 없습니다.' },
      });
    }
    return announcement;
  }

  create(authorId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned,
        authorId,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.findOne(id);
    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { id };
  }
}
