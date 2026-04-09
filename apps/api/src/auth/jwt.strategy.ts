import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AccessTokenPayload } from './auth.service';

/**
 * JWT access-token strategy. The strategy is *stateless* — it verifies the
 * signature and populates `req.user`. Route-level guards then check role /
 * permission; the DB is consulted by PermissionsGuard, not here.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<{
    id: string;
    email: string;
    role: string;
  }> {
    // Bounce tokens whose underlying user is no longer active. This is the
    // one DB hit we accept on every authenticated request; cache later if
    // latency becomes a concern.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
