import { z } from 'zod';
import { idSchema } from './common.js';

/**
 * OKR (Objectives & Key Results) DTOs.
 *
 * Progress is an integer 0-100 stored per key result. The objective's
 * overall progress is the average of its key results, computed
 * server-side — never trust a client-sent objective progress value.
 */

/** "YYYYQn" e.g. "2026Q1". Validated at both create and list-filter time. */
export const okrPeriodSchema = z
  .string()
  .regex(/^\d{4}Q[1-4]$/, '형식은 "YYYYQn" 이어야 합니다. 예: 2026Q1');
export type OkrPeriod = z.infer<typeof okrPeriodSchema>;

export const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  period: okrPeriodSchema,
  ownerId: idSchema.optional(),
});
export type CreateObjectiveDto = z.infer<typeof createObjectiveSchema>;

export const updateObjectiveSchema = createObjectiveSchema.partial();
export type UpdateObjectiveDto = z.infer<typeof updateObjectiveSchema>;

export const createKeyResultSchema = z.object({
  title: z.string().min(1).max(200),
  progress: z.number().int().min(0).max(100).default(0),
});
export type CreateKeyResultDto = z.infer<typeof createKeyResultSchema>;

export const updateKeyResultSchema = createKeyResultSchema.partial();
export type UpdateKeyResultDto = z.infer<typeof updateKeyResultSchema>;

/**
 * Current + next three quarters as an array of strings. Useful for the
 * period picker in both form and filter UI.
 */
export function currentOkrPeriods(): OkrPeriod[] {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const out: OkrPeriod[] = [];
  let y = year;
  let q = quarter;
  for (let i = 0; i < 4; i++) {
    out.push(`${y}Q${q}` as OkrPeriod);
    q++;
    if (q > 4) {
      q = 1;
      y++;
    }
  }
  return out;
}
