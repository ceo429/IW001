import type { RoleId } from '@iw001/shared';

export interface PermissionRow {
  role: RoleId;
  pageId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  updatedAt: string;
}

export type PermissionAction = 'canRead' | 'canWrite' | 'canDelete';

export interface PermissionChangePayload {
  role: RoleId;
  pageId: string;
  canRead?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
}
