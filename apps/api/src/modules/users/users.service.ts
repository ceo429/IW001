import { Injectable } from '@nestjs/common';
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
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        department: dto.department,
        role: dto.role as 'admin' | 'manager' | 'engineer' | 'viewer' | undefined,
        status: dto.status as 'active' | 'inactive' | 'locked' | undefined,
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
  }

  private generateTempPassword(): string {
    // 16 random bytes -> base64url, plus forced classes to satisfy policy.
    const rnd = randomBytes(12).toString('base64url');
    return `Tmp#${rnd}A1`;
  }
}
