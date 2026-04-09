import type { AsStatus } from '@iw001/shared';

export interface AsTicketRow {
  id: string;
  homeId: string | null;
  home: {
    id: string;
    name: string;
    customer: { id: string; name: string } | null;
  } | null;
  symptom: string;
  rootCause: string | null;
  action: string | null;
  status: AsStatus;
  openedAt: string;
  closedAt: string | null;
  assigneeId: string | null;
}
