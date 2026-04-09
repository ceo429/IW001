import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateUserDto, UpdateUserDto } from '@iw001/shared';

const ARGON2_OPTS = {
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * User CRUD. Only admins should reach this service — enforced at the
 * controller layer via @Roles('admin').
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        department: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        mustChangePw: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        department: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        mustChangePw: true,
      },
    });
    if (!user) {
      throw new NotFoundException({
        error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다.' },
      });
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    // If caller didn't pass a password, generate a strong temporary one and
    // force reset on first login.
    const rawPassword = dto.initialPassword ?? this.generateTempPassword();
    const passwordHash = await hash(rawPassword, ARGON2_OPTS);

    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone ?? null,
        department: dto.department ?? null,
        role: dto.role as 'admin' | 'manager' | 'engineer' | 'viewer',
        passwordHash,
        mustChangePw: true,
      },
      select: { id: true, email: true, name: true, role: true, mustChangePw: true },
    });

    return {
      user: created,
      // Return once so the admin can communicate it; never stored.
      initialPassword: dto.initialPassword ? undefined : rawPassword,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        department: dto.department,
        role: dto.role as 'admin' | 'manager' | 'engineer' | 'viewer' | undefined,
        status: dto.status as 'active' | 'inactive' | 'locked' | undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        department: true,
        phone: true,
      },
    });
  }

  /**
   * Soft delete: mark the user `inactive` and anonymize the email. We
   * deliberately DO NOT hard-delete because the AuditLog and historical
   * Quote rows reference `userId` and we need the paper trail preserved.
   *
   * Also blocks an admin from soft-deleting themselves (small foot-gun guard).
   */
  async softDelete(id: string, actingUserId: string) {
    if (id === actingUserId) {
      throw new BadRequestException({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: '본인 계정은 삭제할 수 없습니다.',
        },
      });
    }
    const user = await this.findOne(id);
    // Revoke all active sessions so the user is booted out immediately.
    await this.prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.prisma.user.update({
      where: { id },
      data: {
        status: 'inactive',
        email: `deleted+${user.id}@iw001.invalid`,
      },
      select: { id: true, email: true, status: true },
    });
  }

  /**
   * Reset a user's password to a freshly generated temporary value. Forces
   * change on next login. Returns the temporary password once so the admin
   * can hand it to the user out-of-band.
   */
  async resetPassword(id: string) {
    await this.findOne(id);
    const rawPassword = this.generateTempPassword();
    const passwordHash = await hash(rawPassword, ARGON2_OPTS);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePw: true, failedLoginCnt: 0, lockedUntil: null },
    });
    // Also revoke sessions so old tokens can't keep going.
    await this.prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { temporaryPassword: rawPassword };
  }

  private generateTempPassword(): string {
    // 16 random bytes -> base64url, plus forced classes to satisfy policy.
    const rnd = randomBytes(12).toString('base64url');
    return `Tmp#${rnd}A1`;
  }
}
