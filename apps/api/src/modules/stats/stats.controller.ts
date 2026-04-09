import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { StatsService } from './stats.service';

const periodQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).default(new Date().getFullYear()),
});

const multiYearQuerySchema = z
  .object({
    from: z.coerce.number().int().min(2000).max(2100),
    to: z.coerce.number().int().min(2000).max(2100),
  })
  .refine((v) => v.from <= v.to, {
    message: 'from은 to보다 이전이거나 같아야 합니다.',
    path: ['from'],
  })
  .refine((v) => v.to - v.from <= 20, {
    message: '연도 범위는 최대 20년까지 조회할 수 있습니다.',
    path: ['to'],
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

  @Get('multi-year')
  @Roles('admin', 'manager', 'viewer')
  @RequirePermission('period-stats', 'read')
  multiYear(
    @Query(new ZodValidationPipe(multiYearQuerySchema)) query: { from: number; to: number },
  ) {
    return this.stats.multiYear(query.from, query.to);
  }
}
