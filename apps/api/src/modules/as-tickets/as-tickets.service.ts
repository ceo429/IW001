import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AsStatus as PrismaAsStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  canTransitionAs,
  type AsStatus,
  type CreateAsTicketDto,
  type UpdateAsTicketDto,
} from '@iw001/shared';

@Injectable()
export class AsTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: AsStatus, homeId?: string) {
    const where: Prisma.AsTicketWhereInput = {
      ...(status && { status: status as PrismaAsStatus }),
      ...(homeId && { homeId }),
    };
    return this.prisma.asTicket.findMany({
      where,
      include: {
        home: {
          select: {
            id: true,
            name: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.asTicket.findUnique({
      where: { id },
      include: {
        home: {
          include: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!ticket) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: 'AS 티켓을 찾을 수 없습니다.' },
      });
    }
    return ticket;
  }

  create(dto: CreateAsTicketDto) {
    return this.prisma.asTicket.create({
      data: {
        homeId: dto.homeId ?? null,
        symptom: dto.symptom,
        rootCause: dto.rootCause ?? null,
        action: dto.action ?? null,
        assigneeId: dto.assigneeId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateAsTicketDto) {
    await this.findOne(id);
    return this.prisma.asTicket.update({
      where: { id },
      data: {
        homeId: dto.homeId,
        symptom: dto.symptom,
        rootCause: dto.rootCause,
        action: dto.action,
        assigneeId: dto.assigneeId,
      },
    });
  }

  async transition(id: string, to: AsStatus) {
    const ticket = await this.findOne(id);
    if (!canTransitionAs(ticket.status as AsStatus, to)) {
      throw new BadRequestException({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: `상태 전이 불가: ${ticket.status} → ${to}`,
        },
      });
    }
    return this.prisma.asTicket.update({
      where: { id },
      data: {
        status: to as PrismaAsStatus,
        // Capture terminal-state timestamp when closing, null it on reopen.
        closedAt: to === 'closed' ? new Date() : to === 'in_progress' ? null : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.asTicket.delete({ where: { id } });
    return { id };
  }
}
