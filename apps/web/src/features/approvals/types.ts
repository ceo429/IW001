import type { ApprovalStatus } from '@iw001/shared';

export interface ApprovalRow {
  id: string;
  title: string;
  body: string;
  status: ApprovalStatus;
  requesterId: string;
  approverIds: string[];
  createdAt: string;
  decidedAt: string | null;
}
