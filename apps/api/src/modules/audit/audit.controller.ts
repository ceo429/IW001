import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { AuditReadService, type AuditQuery } from './audit.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  userId: z.string().uuid().optional(),
  resource: z.string().max(40).optional(),
  action: z.string().max(40).optional(),
  severity: z.enum(['normal', 'high']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().max(120).optional(),
});

/**
 * Audit log reader. Admin-only: nothing else should ever see this table.
 */
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditReadService) {}

  @Get()
  @Roles('admin')
  @RequirePermission('audit', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: AuditQuery) {
    return this.audit.list(query);
  }

  @Get('facets')
  @Roles('admin')
  @RequirePermission('audit', 'read')
  facets() {
    return this.audit.facets();
  }
}
