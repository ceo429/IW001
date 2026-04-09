import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

/**
 * Schemas for the /auth endpoints. Every one of these is run through
 * ZodValidationPipe on the NestJS side, so a payload that does not match
 * results in a 400 with structured field errors — never a crash.
 */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력하세요.').max(128),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['confirm'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: '새 비밀번호는 기존 비밀번호와 달라야 합니다.',
    path: ['newPassword'],
  });
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10).max(512),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirm'],
  });
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
