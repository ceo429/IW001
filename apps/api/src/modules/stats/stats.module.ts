import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

/**
 * Read-only analytics module. The service composes small aggregate
 * queries (Prisma groupBy + count) into chart-friendly payloads.
 */
@Module({
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
