import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_META, AuditMeta } from './audit.decorator';

/**
 * Automatically writes an `AuditLog` row for every mutation that carries an
 * `@Audit()` decorator on the controller method. This keeps the audit trail
 * adjacent to the write path (same request, same tx potential) without
 * sprinkling `auditLog.create()` calls into every service.
 *
 * See docs/SECURITY.md §8.2 for the fields and severity levels.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_META,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<{
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      method: string;
      originalUrl?: string;
      url?: string;
      user?: { id?: string };
      params?: Record<string, string>;
    }>();

    return next.handle().pipe(
      tap({
        next: (response: unknown) => {
          void this.write(meta, req, response);
        },
        // Failed requests are already captured by the exception filter; we
        // deliberately do NOT audit failures here to avoid duplicate noise.
      }),
    );
  }

  private async write(
    meta: AuditMeta,
    req: {
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      method: string;
      originalUrl?: string;
      url?: string;
      user?: { id?: string };
      params?: Record<string, string>;
    },
    response: unknown,
  ) {
    try {
      const ua = req.headers['user-agent'];
      const resourceId =
        (response as { id?: string } | null)?.id ?? req.params?.id ?? null;

      await this.prisma.auditLog.create({
        data: {
          userId: req.user?.id ?? null,
          ip: req.ip ?? 'unknown',
          userAgent: (Array.isArray(ua) ? ua[0] : ua) ?? 'unknown',
          method: req.method,
          path: req.originalUrl ?? req.url ?? 'unknown',
          resource: meta.resource,
          resourceId,
          action: meta.action,
          severity: meta.severity ?? 'normal',
          after: response as object | null,
        },
      });
    } catch {
      // Best-effort: never fail the request because of audit-log write.
    }
  }
}
