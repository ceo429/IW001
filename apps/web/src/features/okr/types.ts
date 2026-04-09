export interface KeyResultRow {
  id: string;
  objectiveId: string;
  title: string;
  progress: number; // 0-100
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveRow {
  id: string;
  title: string;
  description: string | null;
  period: string; // "2026Q1"
  ownerId: string | null;
  /** Server-computed average of key result progress. Not writable. */
  progress: number;
  keyResults: KeyResultRow[];
  createdAt: string;
  updatedAt: string;
}
