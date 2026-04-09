import { SetMetadata } from '@nestjs/common';
import type { PermissionAction } from '@iw001/shared';

export const PERMISSION_KEY = 'iw001:permission';

export interface RequiredPermission {
  pageId: string;
  action: PermissionAction;
}

/**
 * Require a specific (pageId, action) permission. The PermissionsGuard
 * reads the runtime matrix from the `Permission` table and enforces it.
 * This is the *final* authority, not the role decorator.
 *
 *   @RequirePermission('quotes', 'write')
 *   @Post()
 */
export const RequirePermission = (pageId: string, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { pageId, action } satisfies RequiredPermission);
