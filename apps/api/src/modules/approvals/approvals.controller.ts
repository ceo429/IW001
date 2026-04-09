import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  createApprovalSchema,
  decideApprovalSchema,
  type CreateApprovalDto,
  type DecideApprovalDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/decorators/current-user.decorator';
import { ApprovalsService, type ApprovalFilter } from './approvals.service';

const listQuerySchema = z.object({
  filter: z.enum(['mine', 'assigned', 'all']).default('all'),
});

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('approvals', 'read')
  list(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query(new ZodValidationPipe(listQuerySchema)) query: { filter: ApprovalFilter },
  ) {
    return this.approvals.list(user.id, query.filter);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('approvals', 'read')
  findOne(@Param('id') id: string) {
    return this.approvals.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('approvals', 'write')
  @Audit({ resource: 'approval', action: 'create' })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body(new ZodValidationPipe(createApprovalSchema)) dto: CreateApprovalDto,
  ) {
    return this.approvals.create(user.id, dto);
  }

  @Post(':id/decide')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('approvals', 'write')
  @Audit({ resource: 'approval', action: 'decide' })
  decide(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body(new ZodValidationPipe(decideApprovalSchema)) dto: DecideApprovalDto,
  ) {
    return this.approvals.decide(id, user.id, dto.decision);
  }

  @Post(':id/cancel')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('approvals', 'write')
  @Audit({ resource: 'approval', action: 'cancel' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return this.approvals.cancel(id, user.id);
  }
}
