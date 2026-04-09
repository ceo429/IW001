import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Zod-backed validation pipe.
 *
 * Usage:
 *   @Post()
 *   create(@Body(new ZodValidationPipe(createQuoteSchema)) dto: CreateQuoteDto) { ... }
 *
 * On failure it throws a 400 BadRequestException whose body matches the
 * `VALIDATION_ERROR` shape documented in docs/API.md §1.2 — i.e.
 * `{ error: { code, message, details: { fieldPath: [msg, ...] } } }`.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new BadRequestException(this.format(result.error));
  }

  private format(err: ZodError): {
    error: { code: string; message: string; details: Record<string, string[]> };
  } {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.length ? issue.path.join('.') : '_root';
      (details[path] ??= []).push(issue.message);
    }
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: '요청 본문이 유효하지 않습니다.',
        details,
      },
    };
  }
}
