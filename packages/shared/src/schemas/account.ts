import { z } from 'zod';
import { emailSchema, idSchema } from './common.js';

/**
 * 헤이홈 account DTOs.
 *
 * `period` is a 2-digit year string (e.g. "26" for 2026 contracts) used to
 * group cards in the UI. `tokenStatus` is a plain enum because the real
 * integration hasn't landed yet — when it does, we'll check against the
 * heyhome API and the field will update automatically.
 */

export const tokenStatusSchema = z.enum(['valid', 'expired']);
export type TokenStatus = z.infer<typeof tokenStatusSchema>;

export const createAccountSchema = z.object({
  email: emailSchema,
  period: z
    .string()
    .regex(/^\d{2}$/, '연도(YY)는 2자리 숫자여야 합니다.')
    .default(String(new Date().getFullYear()).slice(-2)),
  tokenStatus: tokenStatusSchema.default('valid'),
  tokenExpiresAt: z.string().datetime().optional(),
  customerId: idSchema.optional(),
});
export type CreateAccountDto = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountDto = z.infer<typeof updateAccountSchema>;
