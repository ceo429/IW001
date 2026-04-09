import type { Priority, ProjectStatus } from '@iw001/shared';

export interface TaskRow {
  id: string;
  projectId: string;
  title: string;
  status: ProjectStatus;
  priority: Priority;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRow {
  id: string;
  title: string;
  status: ProjectStatus;
  priority: Priority;
  customerId: string | null;
  customer: { id: string; name: string } | null;
  startAt: string | null;
  dueAt: string | null;
  createdAt: string;
  _count?: { tasks: number };
}

export interface ProjectDetail extends ProjectRow {
  customer: { id: string; name: string } | null;
  tasks: TaskRow[];
}
