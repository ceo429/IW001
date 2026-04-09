import { Module } from '@nestjs/common';
import { AsGuidesController } from './as-guides.controller';
import { AsGuidesService } from './as-guides.service';

@Module({
  controllers: [AsGuidesController],
  providers: [AsGuidesService],
  exports: [AsGuidesService],
})
export class AsGuidesModule {}
