import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Role } from '@prisma/client';

export interface PermissionChange {
  role: Role;
  pageId: string;
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  listAll() {
    return this.prisma.permission.findMany({ orderBy: [{ role: 'asc' }, { pageId: 'asc' }] });
  }

  /**
   * Apply a batch of matrix edits in a single transaction. Any invalid
   * (role, pageId) pair aborts the whole batch — we never leave the matrix
   * half-updated. The caller should also wrap this in an @Audit decorator
   * so the change lands in the audit log.
   */
  applyChanges(changes: PermissionChange[]) {
    return this.prisma.$transaction(
      changes.map((c) =>
        this.prisma.permission.update({
          where: { role_pageId: { role: c.role, pageId: c.pageId } },
          data: {
            canRead: c.canRead,
            canWrite: c.canWrite,
            canDelete: c.canDelete,
          },
        }),
      ),
    );
  }
}
