import { Module } from '@nestjs/common';
import { AsTicketsController } from './as-tickets.controller';
import { AsTicketsService } from './as-tickets.service';

@Module({
  controllers: [AsTicketsController],
  providers: [AsTicketsService],
  exports: [AsTicketsService],
})
export class AsTicketsModule {}
