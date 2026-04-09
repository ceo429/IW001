import type { TokenStatus } from '@iw001/shared';

export interface AccountRow {
  id: string;
  email: string;
  period: string;
  tokenStatus: TokenStatus;
  tokenExpiresAt: string | null;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  createdAt: string;
  _count: { homes: number };
}
