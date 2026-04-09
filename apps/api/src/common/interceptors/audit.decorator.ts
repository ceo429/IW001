import { SetMetadata } from '@nestjs/common';

export const AUDIT_META = 'iw001:audit';

export interface AuditMeta {
  resource: string;
  action: string;
  severity?: 'normal' | 'high';
}

/**
 * Mark a controller method as auditable. The AuditInterceptor reads this
 * metadata and writes an AuditLog row after the method returns successfully.
 *
 *   @Audit({ resource: 'quote', action: 'create' })
 *   @Audit({ resource: 'permission', action: 'update', severity: 'high' })
 */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_META, meta);
