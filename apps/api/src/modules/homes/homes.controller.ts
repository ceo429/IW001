import { Body, Controller, Get, Param, Patch, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  updateDevicePositionSchema,
  updateFloorPlanSchema,
  type UpdateDevicePositionDto,
  type UpdateFloorPlanDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { HomesService } from './homes.service';

const listQuerySchema = z.object({
  q: z.string().max(120).optional(),
  filter: z.enum(['all', 'offline']).default('all'),
});

@Controller('homes')
export class HomesController {
  constructor(private readonly homes: HomesService) {}

  @Get('overview')
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('dashboard', 'read')
  overview() {
    return this.homes.overview();
  }

  @Get()
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('home-status', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.homes.listWithStatus(query.q, query.filter);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('home-status', 'read')
  findOne(@Param('id') id: string) {
    return this.homes.findOne(id);
  }

  // ---- Spatial mapping ---------------------------------------------------

  @Get(':id/spatial')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('spatial', 'read')
  getSpatial(@Param('id') id: string) {
    return this.homes.getSpatial(id);
  }

  @Put(':id/floor-plan')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('spatial', 'write')
  @Audit({ resource: 'home', action: 'update-floor-plan' })
  setFloorPlan(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFloorPlanSchema)) dto: UpdateFloorPlanDto,
  ) {
    return this.homes.setFloorPlan(id, dto.svg);
  }

  @Patch('devices/:deviceId/position')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('spatial', 'write')
  @Audit({ resource: 'device', action: 'update-position' })
  updateDevicePosition(
    @Param('deviceId') deviceId: string,
    @Body(new ZodValidationPipe(updateDevicePositionSchema)) dto: UpdateDevicePositionDto,
  ) {
    return this.homes.updateDevicePosition(deviceId, dto.posX, dto.posY);
  }
}
