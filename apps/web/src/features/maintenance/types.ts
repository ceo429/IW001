import type { ChecklistItem } from '@iw001/shared';

export interface MaintenanceJobRow {
  id: string;
  homeId: string;
  home: {
    id: string;
    name: string;
    customer: { id: string; name: string } | null;
  };
  scheduledAt: string;
  checklist: ChecklistItem[];
  done: boolean;
  doneAt: string | null;
  engineerId: string | null;
}
