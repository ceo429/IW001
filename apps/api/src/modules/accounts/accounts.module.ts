import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

/**
 * 헤이홈 API accounts module. Not to be confused with `Session` or `User`
 * — these are the upstream IoT platform credentials used to fetch device
 * state from Hey Home and its siblings.
 */
@Module({
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
