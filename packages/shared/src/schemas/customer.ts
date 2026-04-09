import { z } from 'zod';
import { emailSchema, percentSchema, phoneSchema } from './common.js';

/**
 * Customer DTO schemas. The `discountRate` is a default applied when creating
 * a new quote for this customer; the quote itself can still override it.
 */

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  ceoName: z.string().max(80).optional(),
  bizNo: z
    .string()
    .regex(/^[0-9-]{0,20}$/, '사업자등록번호는 숫자와 하이픈만 허용됩니다.')
    .optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  address: z.string().max(300).optional(),
  discountRate: percentSchema.default(0),
  note: z.string().max(2000).optional(),
});
export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
