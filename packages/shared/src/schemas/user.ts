import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './common.js';
import { ROLE_IDS } from '../constants/roles.js';

/**
 * User admin schemas. Only admins may create/update users — enforced by
 * NestJS RolesGuard, not by these schemas.
 */

export const roleEnumSchema = z.enum(ROLE_IDS as [string, ...string[]]);

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(80),
  phone: phoneSchema,
  department: z.string().max(100).optional(),
  role: roleEnumSchema,
  /** Optional — if omitted, a random temporary password is generated. */
  initialPassword: passwordSchema.optional(),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  phone: phoneSchema,
  department: z.string().max(100).optional(),
  role: roleEnumSchema.optional(),
  status: z.enum(['active', 'inactive', 'locked']).optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
