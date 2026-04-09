import { Body, Controller, Get, Patch } from '@nestjs/common';
import { z } from 'zod';
import { ROLE_IDS } from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { PermissionsService, type PermissionChange } from './permissions.service';
import type { Role } from '@prisma/client';

const updateSchema = z.object({
  changes: z
    .array(
      z.object({
        role: z.enum(ROLE_IDS as [string, ...string[]]),
        pageId: z.string().min(1).max(40),
        canRead: z.boolean().optional(),
        canWrite: z.boolean().optional(),
        canDelete: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(200),
});

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @Roles('admin', 'manager')
  @RequirePermission('admin', 'read')
  list() {
    return this.permissions.listAll();
  }

  @Patch()
  @Roles('admin')
  @RequirePermission('admin', 'write')
  @Audit({ resource: 'permission', action: 'update', severity: 'high' })
  update(@Body(new ZodValidationPipe(updateSchema)) dto: z.infer<typeof updateSchema>) {
    const changes: PermissionChange[] = dto.changes.map((c) => ({
      role: c.role as Role,
      pageId: c.pageId,
      canRead: c.canRead,
      canWrite: c.canWrite,
      canDelete: c.canDelete,
    }));
    return this.permissions.applyChanges(changes);
  }
}
