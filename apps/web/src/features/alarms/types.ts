import type { NotifSeverity } from '@iw001/shared';

export interface NotificationRow {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  severity: NotifSeverity;
  read: boolean;
  createdAt: string;
}
