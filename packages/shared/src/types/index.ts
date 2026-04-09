/**
 * Shared TypeScript types that describe API contracts. These are separate
 * from zod schemas because some types are inferred from schemas (see
 * `../schemas`), while others are purely runtime shapes (pagination, errors).
 */

export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PageInfo;
}

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface AuthenticatedUserSummary {
  id: string;
  email: string;
  name: string;
  role: import('../constants/roles.js').RoleId;
  /** Page IDs the user can read (derived from permission matrix). */
  readablePages: string[];
  /** Page IDs the user can write. */
  writablePages: string[];
  mustChangePw: boolean;
}
