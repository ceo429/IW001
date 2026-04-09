import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { StatsService } from './stats.service';

const periodQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).default(new Date().getFullYear()),
});

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('by-customer')
  @Roles('admin', 'manager', 'viewer')
  @RequirePermission('stats', 'read')
  byCustomer() {
    return this.stats.byCustomer();
  }

  @Get('by-product')
  @Roles('admin', 'manager', 'viewer')
  @RequirePermission('stats', 'read')
  byProduct() {
    return this.stats.byProduct();
  }

  @Get('by-period')
  @Roles('admin', 'manager', 'viewer')
  @RequirePermission('stats', 'read')
  byPeriod(@Query(new ZodValidationPipe(periodQuerySchema)) query: { year: number }) {
    return this.stats.byPeriod(query.year);
  }
}
