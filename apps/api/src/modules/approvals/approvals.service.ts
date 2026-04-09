import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateApprovalDto } from '@iw001/shared';

export type ApprovalFilter = 'mine' | 'assigned' | 'all';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, filter: ApprovalFilter) {
    const where: Prisma.ApprovalRequestWhereInput =
      filter === 'mine'
        ? { requesterId: userId }
        : filter === 'assigned'
          ? { approverIds: { has: userId } }
          : {};
    return this.prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string) {
    const approval = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!approval) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '결재를 찾을 수 없습니다.' },
      });
    }
    return approval;
  }

  async create(requesterId: string, dto: CreateApprovalDto) {
    // Requester can't list themselves as an approver — self-approval
    // defeats the purpose of a review workflow.
    if (dto.approverIds.includes(requesterId)) {
      throw new BadRequestException({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: '본인은 결재자로 지정할 수 없습니다.',
        },
      });
    }
    return this.prisma.approvalRequest.create({
      data: {
        title: dto.title,
        body: dto.body,
        requesterId,
        approverIds: dto.approverIds,
      },
    });
  }

  /**
   * Record a decision from one of the listed approvers. In this simple
   * model any single approver can move the request to its terminal state;
   * a future upgrade could require all approvers to sign off (quorum).
   */
  async decide(
    id: string,
    userId: string,
    decision: 'approve' | 'reject',
  ) {
    const approval = await this.findOne(id);
    if (approval.status !== 'pending') {
      throw new BadRequestException({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: '이미 결정된 결재입니다.',
        },
      });
    }
    if (!approval.approverIds.includes(userId)) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: '지정된 결재자가 아닙니다.' },
      });
    }
    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: decision === 'approve' ? 'approved' : 'rejected',
        decidedAt: new Date(),
      },
    });
  }

  /** Only the requester may cancel, and only while still pending. */
  async cancel(id: string, userId: string) {
    const approval = await this.findOne(id);
    if (approval.requesterId !== userId) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: '본인이 올린 결재만 취소할 수 있습니다.' },
      });
    }
    if (approval.status !== 'pending') {
      throw new BadRequestException({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: '진행 중인 결재만 취소할 수 있습니다.',
        },
      });
    }
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { status: 'cancelled', decidedAt: new Date() },
    });
  }
}
