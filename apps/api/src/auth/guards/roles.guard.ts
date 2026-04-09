import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ROLES, type RoleId } from '@iw001/shared';

/**
 * Role gate. Reads `@Roles(...)` metadata and rejects when the current user's
 * role is not listed. Respects the hierarchy (admin outranks everyone).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleId[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: { role: RoleId } }>();
    const role = req.user?.role;
    if (!role) return false; // JwtAuthGuard should have caught this already

    // Admin always passes.
    if (role === 'admin') return true;

    // Exact match or higher rank than any of the required roles.
    const userRank = ROLES[role]?.rank ?? 0;
    const ok = required.some((r) => userRank >= (ROLES[r]?.rank ?? 0));
    if (!ok) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: '권한이 부족합니다.' },
      });
    }
    return true;
  }
}
