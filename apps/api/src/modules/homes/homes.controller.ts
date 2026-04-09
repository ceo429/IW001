import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
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
}
