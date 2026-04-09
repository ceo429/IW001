import { z } from 'zod';
import { idSchema } from './common.js';

/**
 * AS ticket (AS 인입건) DTOs per 기획서 §4.2.3.
 *
 * State machine mirrors the Prisma `AsStatus` enum:
 *   open → in_progress → resolved → closed
 *
 * We allow going back from resolved/closed to in_progress because that
 * mirrors real maintenance flow (a ticket can be reopened if the fix
 * didn't hold). `closed` is terminal unless reopened.
 */

export const asStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export type AsStatus = z.infer<typeof asStatusSchema>;

export const AS_STATUS_LABELS: Record<AsStatus, string> = {
  open: '접수',
  in_progress: '진행',
  resolved: '해결',
  closed: '종료',
};

export const AS_STATUS_ORDER: readonly AsStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const;

export const AS_STATUS_TRANSITIONS: Record<AsStatus, readonly AsStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: ['in_progress'],
};

export function canTransitionAs(from: AsStatus, to: AsStatus): boolean {
  return AS_STATUS_TRANSITIONS[from].includes(to);
}

export const createAsTicketSchema = z.object({
  homeId: idSchema.optional(),
  symptom: z.string().min(1, '증상을 입력하세요.').max(500),
  rootCause: z.string().max(1000).optional(),
  action: z.string().max(1000).optional(),
  assigneeId: idSchema.optional(),
});
export type CreateAsTicketDto = z.infer<typeof createAsTicketSchema>;

export const updateAsTicketSchema = createAsTicketSchema.partial();
export type UpdateAsTicketDto = z.infer<typeof updateAsTicketSchema>;

export const transitionAsTicketSchema = z.object({
  to: asStatusSchema,
});
export type TransitionAsTicketDto = z.infer<typeof transitionAsTicketSchema>;
