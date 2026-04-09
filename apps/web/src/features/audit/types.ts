import type { RoleId } from '@iw001/shared';

export interface AuditLogRow {
  id: string;
  userId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: RoleId;
  } | null;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  resource: string;
  resourceId: string | null;
  action: string;
  severity: 'normal' | 'high';
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuditListResponse {
  data: AuditLogRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface AuditFacets {
  resources: string[];
  actions: string[];
}

export interface AuditQueryParams {
  page: number;
  pageSize: number;
  userId?: string;
  resource?: string;
  action?: string;
  severity?: 'normal' | 'high';
  from?: string;
  to?: string;
  q?: string;
}
