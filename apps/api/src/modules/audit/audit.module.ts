import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditReadService } from './audit.service';

/**
 * NOTE — the audit WRITE path already exists as AuditInterceptor in
 * src/common/interceptors. This module owns only the READ side: an admin
 * viewer with filters and CSV export. Keeping them physically separate
 * avoids any accidental coupling where a reader could mutate audit rows.
 */
@Module({
  controllers: [AuditController],
  providers: [AuditReadService],
  exports: [AuditReadService],
})
export class AuditModule {}
