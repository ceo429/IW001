import { z } from 'zod';
import { idSchema } from './common.js';

/**
 * Notification DTOs. A null `userId` means the notification is a broadcast
 * visible to everyone — the backend list query unions user-scoped rows
 * with broadcasts.
 */

export const notifSeveritySchema = z.enum(['info', 'warning', 'error', 'critical']);
export type NotifSeverity = z.infer<typeof notifSeveritySchema>;

export const NOTIF_SEVERITY_LABELS: Record<NotifSeverity, string> = {
  info: '정보',
  warning: '주의',
  error: '에러',
  critical: '심각',
};

export const createNotificationSchema = z.object({
  userId: idSchema.optional(), // omit => broadcast
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  severity: notifSeveritySchema.default('info'),
});
export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
