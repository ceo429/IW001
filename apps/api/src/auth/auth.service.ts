import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import type { LoginDto, ChangePasswordDto } from '@iw001/shared';

/**
 * Authentication and session management.
 *
 * Responsibilities:
 *   - Verify credentials with Argon2id (constant-time)
 *   - Issue Access (short-lived) and Refresh (long-lived, rotated) JWTs
 *   - Enforce lockout after N consecutive failures
 *   - Maintain the `Session` table for refresh-token rotation + revoke
 *
 * Rate limiting is layered ON TOP of this service in auth.controller.ts.
 */

const ARGON2_OPTS = {
  memoryCost: 19 * 1024, // OWASP 2024 recommendation
  timeCost: 2,
  parallelism: 1,
} as const;

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshJti: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(
    dto: LoginDto,
    ctx: { ip: string; userAgent: string },
  ): Promise<{ user: PublicUser; tokens: IssuedTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Constant-time-ish: still verify against a dummy hash if the user doesn't
    // exist so the response time doesn't leak account existence.
    if (!user) {
      await verify(
        '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$ZvW8Hc7rFVhgY/e39xjq5g',
        dto.password,
      ).catch(() => false);
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: '계정이 일시 잠겼습니다. 잠시 후 다시 시도하세요.',
        },
      });
    }

    const ok = await verify(user.passwordHash, dto.password).catch(() => false);
    if (!ok) {
      const failed = user.failedLoginCnt + 1;
      const shouldLock = failed >= MAX_FAILED_LOGINS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCnt: failed,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : user.lockedUntil,
        },
      });
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      });
    }

    // Success — reset counter, record session, issue tokens.
    const tokens = await this.issueTokens(user.id, user.email, user.role, ctx);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCnt: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    return { user: toPublic(user), tokens };
  }

  // ---------------------------------------------------------------------------
  // Refresh — rotate refresh token, revoke old session
  // ---------------------------------------------------------------------------

  async refresh(
    refreshToken: string,
    ctx: { ip: string; userAgent: string },
  ): Promise<IssuedTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; jti: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Refresh 토큰이 유효하지 않습니다.' },
      });
    }

    const session = await this.prisma.session.findUnique({
      where: { refreshJti: payload.jti },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      // Token reuse after revoke → nuclear: revoke ALL sessions for this user.
      if (session && session.revokedAt) {
        await this.prisma.session.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: 'Refresh 토큰이 만료되었거나 무효화되었습니다.' },
      });
    }

    // Rotate: revoke current, issue new.
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHENTICATED', message: '계정이 비활성 상태입니다.' },
      });
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.email, user.role, ctx);
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<{ jti: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.prisma.session.updateMany({
        where: { refreshJti: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Invalid/expired refresh token — nothing to revoke.
    }
  }

  // ---------------------------------------------------------------------------
  // Change password
  // ---------------------------------------------------------------------------

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const ok = await verify(user.passwordHash, dto.currentPassword).catch(() => false);
    if (!ok) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: '현재 비밀번호가 올바르지 않습니다.' },
      });
    }

    const newHash = await hash(dto.newPassword, ARGON2_OPTS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, mustChangePw: false },
    });
  }

  // ---------------------------------------------------------------------------
  // Token issuance
  // ---------------------------------------------------------------------------

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    ctx: { ip: string; userAgent: string },
  ): Promise<IssuedTokens> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, jti: accessJti } satisfies AccessTokenPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );

    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti: refreshJti },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );

    const refreshExpiresAt = new Date(Date.now() + parseTtlToMs(refreshTtl));

    await this.prisma.session.create({
      data: {
        userId,
        refreshJti,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshJti, refreshExpiresAt };
  }
}

// ---- helpers ----

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePw: boolean;
}

function toPublic(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePw: boolean;
}): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    mustChangePw: u.mustChangePw,
  };
}

/**
 * Very small TTL parser — supports "<n>s|m|h|d". Throws on unknown format
 * so a typo in the env var fails fast at boot rather than producing invalid
 * session expiry.
 */
function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(ttl.trim());
  if (!match) throw new Error(`Invalid TTL: ${ttl}`);
  const n = Number(match[1]);
  const unit = match[2];
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}
