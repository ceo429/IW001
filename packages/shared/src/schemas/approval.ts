import { z } from 'zod';
import { idSchema } from './common.js';

/**
 * Approval request DTOs.
 *
 * Workflow: requester creates → one or more approvers decide →
 * terminal state is approved|rejected|cancelled.
 *
 * The approverIds list is snapshotted at creation time because reassigning
 * mid-flight would require a more complex audit trail. Cancel-and-recreate
 * is the supported reassignment path.
 */

export const approvalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: '진행',
  approved: '승인',
  rejected: '반려',
  cancelled: '취소',
};

export const createApprovalSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  approverIds: z
    .array(idSchema)
    .min(1, '결재자를 1명 이상 지정하세요.')
    .max(10, '결재자는 최대 10명까지 지정할 수 있습니다.'),
});
export type CreateApprovalDto = z.infer<typeof createApprovalSchema>;

export const decideApprovalSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(1000).optional(),
});
export type DecideApprovalDto = z.infer<typeof decideApprovalSchema>;
