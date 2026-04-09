import { z } from 'zod';
import { idSchema } from './common.js';

/**
 * Project & Task DTOs. ProjectStatus is shared between both (same Prisma
 * enum). The server enforces allowed transitions; the client uses it only
 * for UI ordering.
 */

export const projectStatusSchema = z.enum(['todo', 'doing', 'done', 'archived']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const prioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type Priority = z.infer<typeof prioritySchema>;

export const PROJECT_STATUS_ORDER: readonly ProjectStatus[] = [
  'todo',
  'doing',
  'done',
  'archived',
] as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  todo: '대기',
  doing: '진행',
  done: '완료',
  archived: '보관',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
};

// ---- Project ---------------------------------------------------------------

export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  status: projectStatusSchema.default('todo'),
  priority: prioritySchema.default('normal'),
  customerId: idSchema.optional(),
  startAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
});
export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;

// ---- Task ------------------------------------------------------------------

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  status: projectStatusSchema.default('todo'),
  priority: prioritySchema.default('normal'),
  assigneeId: idSchema.optional(),
  dueAt: z.string().datetime().optional(),
});
export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

/** Body for POST /tasks/:id/move { to: ProjectStatus }. */
export const moveTaskSchema = z.object({
  to: projectStatusSchema,
});
export type MoveTaskDto = z.infer<typeof moveTaskSchema>;
