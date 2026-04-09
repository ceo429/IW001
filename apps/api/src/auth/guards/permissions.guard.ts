import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PERMISSION_KEY, type RequiredPermission } from '../decorators/permissions.decorator';
import type { Role } from '@prisma/client';

/**
 * Final authorization gate. Looks up the runtime (role, pageId) entry in the
 * `Permission` table and checks the requested action. The DB matrix is the
 * source of truth; the decorator in @iw001/shared/constants is only a seed.
 *
 * NOTE: This guard does ONE Prisma lookup per guarded request. Swap in a
 * Redis cache later if it becomes a hot spot.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest<{ user?: { role: Role } }>();
    const role = req.user?.role;
    if (!role) return false;

    // Admin always bypasses — keeps the UI recoverable even if the matrix
    // gets nuked.
    if (role === 'admin') return true;

    const row = await this.prisma.permission.findUnique({
      where: { role_pageId: { role, pageId: required.pageId } },
    });
    if (!row) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: '권한 매트릭스에 해당 페이지가 없습니다.' },
      });
    }

    const ok =
      required.action === 'read'
        ? row.canRead
        : required.action === 'write'
          ? row.canWrite
          : row.canDelete;

    if (!ok) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: `권한 부족: ${required.pageId}:${required.action}`,
        },
      });
    }
    return true;
  }
}
