import { z } from 'zod';
import { idSchema } from './common.js';

/**
 * Maintenance job DTOs. A "job" is a scheduled on-site visit for one
 * home — checklist items live inside the record because they change
 * per visit and aren't worth their own table.
 */

export const checklistItemSchema = z.object({
  label: z.string().min(1).max(200),
  done: z.boolean().default(false),
  note: z.string().max(500).optional(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const createMaintenanceJobSchema = z.object({
  homeId: idSchema,
  scheduledAt: z.string().datetime(),
  checklist: z.array(checklistItemSchema).min(1).max(50),
  engineerId: idSchema.optional(),
});
export type CreateMaintenanceJobDto = z.infer<typeof createMaintenanceJobSchema>;

export const updateMaintenanceJobSchema = createMaintenanceJobSchema.partial();
export type UpdateMaintenanceJobDto = z.infer<typeof updateMaintenanceJobSchema>;

/**
 * Suggested default checklist shown in the form when creating a new job.
 * Shared so the frontend and any future seed script agree.
 */
export const DEFAULT_MAINTENANCE_CHECKLIST: readonly string[] = [
  '허브 전원 및 네트워크 확인',
  '디바이스 온라인율 확인',
  '배터리 15% 미만 기기 교체',
  '펌웨어 버전 확인',
  '고객 인수인계 및 사진 촬영',
] as const;
