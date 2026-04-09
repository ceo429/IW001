import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiError, ApiErrorCode } from '@iw001/shared';

/**
 * Converts every unhandled error into the canonical `ApiError` JSON shape.
 * Stack traces are only logged server-side; the client never sees them.
 * See docs/API.md §1.2.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // Already-shaped ApiError (e.g. from ZodValidationPipe)
      if (typeof body === 'object' && body !== null && 'error' in body) {
        res.status(status).json(body);
        return;
      }
      res.status(status).json(this.toApiError(status, exception.message));
      return;
    }

    // Unknown / programming errors — log full detail server side.
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(this.toApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal error'));
  }

  private toApiError(status: number, message: string): ApiError {
    const code: ApiErrorCode = (
      {
        400: 'VALIDATION_ERROR',
        401: 'UNAUTHENTICATED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'BUSINESS_RULE_VIOLATION',
        429: 'RATE_LIMITED',
      } as Record<number, ApiErrorCode>
    )[status] ?? 'INTERNAL_ERROR';
    return { error: { code, message } };
  }
}
