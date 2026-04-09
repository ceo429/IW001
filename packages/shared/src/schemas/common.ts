import { z } from 'zod';

/**
 * Common zod primitives reused across feature schemas. Defining them once
 * here gives us consistent validation messages and makes future adjustments
 * (e.g. relaxing `phoneRegex`) a single-line change.
 */

export const idSchema = z.string().uuid('올바른 UUID가 아닙니다.');

export const emailSchema = z
  .string()
  .email('올바른 이메일 형식이 아닙니다.')
  .max(254, '이메일이 너무 깁니다.');

/** Korean mobile or landline, lightly normalized. */
export const phoneSchema = z
  .string()
  .regex(/^[0-9()+\- ]{9,20}$/, '올바른 전화번호 형식이 아닙니다.')
  .optional();

/**
 * Strong password policy per docs/SECURITY.md §2.1:
 * - min 12 chars
 * - at least 3 of { lowercase, uppercase, digit, symbol }
 */
export const passwordSchema = z
  .string()
  .min(12, '비밀번호는 최소 12자여야 합니다.')
  .max(128, '비밀번호가 너무 깁니다.')
  .refine(
    (pw) => {
      const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) =>
        re.test(pw),
      );
      return classes.length >= 3;
    },
    '대·소문자·숫자·특수문자 중 최소 3종류를 포함해야 합니다.',
  );

/** Generic pagination query params. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/**
 * Monetary value — stored as a non-negative number with up to 2 decimals.
 * The DB uses `Decimal(14, 2)`; on the wire we pass plain numbers and rely on
 * the server to normalize via `Math.round(v * 100) / 100`.
 */
export const moneySchema = z
  .number()
  .nonnegative('금액은 0 이상이어야 합니다.')
  .max(999_999_999_999, '금액이 한도를 초과했습니다.');

export const percentSchema = z
  .number()
  .min(0, '퍼센트는 0 이상이어야 합니다.')
  .max(100, '퍼센트는 100 이하여야 합니다.');
