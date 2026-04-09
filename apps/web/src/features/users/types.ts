import type { RoleId } from '@iw001/shared';

export type UserStatus = 'active' | 'inactive' | 'locked';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: RoleId;
  status: UserStatus;
  department: string | null;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  mustChangePw: boolean;
}

export interface CreateUserResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: RoleId;
    mustChangePw: boolean;
  };
  /** Only returned when the server generated a temporary password. */
  initialPassword?: string;
}

export interface ResetPasswordResponse {
  temporaryPassword: string;
}
