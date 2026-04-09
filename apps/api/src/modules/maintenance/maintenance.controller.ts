import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  createMaintenanceJobSchema,
  updateMaintenanceJobSchema,
  type CreateMaintenanceJobDto,
  type UpdateMaintenanceJobDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { MaintenanceService } from './maintenance.service';

const listQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  homeId: z.string().uuid().optional(),
});

const toggleSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
  done: z.boolean(),
});

@Controller('maintenance-jobs')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('maintenance', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.maintenance.list(query.scope, query.homeId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('maintenance', 'read')
  findOne(@Param('id') id: string) {
    return this.maintenance.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @RequirePermission('maintenance', 'write')
  @Audit({ resource: 'maintenance-job', action: 'create' })
  create(
    @Body(new ZodValidationPipe(createMaintenanceJobSchema)) dto: CreateMaintenanceJobDto,
  ) {
    return this.maintenance.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('maintenance', 'write')
  @Audit({ resource: 'maintenance-job', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMaintenanceJobSchema)) dto: UpdateMaintenanceJobDto,
  ) {
    return this.maintenance.update(id, dto);
  }

  @Post(':id/checklist/toggle')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('maintenance', 'write')
  @Audit({ resource: 'maintenance-job', action: 'checklist-toggle' })
  toggleChecklist(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(toggleSchema)) dto: z.infer<typeof toggleSchema>,
  ) {
    return this.maintenance.toggleChecklist(id, dto.index, dto.done);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('maintenance', 'delete')
  @Audit({ resource: 'maintenance-job', action: 'delete', severity: 'high' })
  remove(@Param('id') id: string) {
    return this.maintenance.remove(id);
  }
}
