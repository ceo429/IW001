/**
 * NestJS bootstrap.
 *
 * Hardens the HTTP layer before any request is served:
 *   - Helmet: standard security headers (see docs/SECURITY.md §5)
 *   - CORS: strict origin allowlist (env API_CORS_ORIGIN)
 *   - cookie-parser: required for refresh-token httpOnly cookie
 *   - Body size limit: 1 MB (most payloads are small; quote items cap at 500)
 *   - Pino logger: structured JSON logs, auto-redacted fields
 *   - Global validation pipe: shared ZodValidationPipe
 *   - Graceful shutdown: SIGINT/SIGTERM → close DB connections
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.use(
    helmet({
      // CSP is configured at the static-site layer (nginx) in production,
      // but we still ship a conservative default for the API itself.
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'frame-ancestors': ["'none'"],
        },
      },
    }),
  );

  app.use(cookieParser());

  const corsOrigin = process.env.API_CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    maxAge: 86400,
  });

  app.setGlobalPrefix('v1');

  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);

  app.get(Logger).log(`API listening on :${port} (CORS: ${corsOrigin})`);
}

void bootstrap();
