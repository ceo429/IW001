import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Shortcut to grab `req.user` as a typed value inside a controller method.
 *
 *   @Get('me')
 *   me(@CurrentUser() user: AuthenticatedRequestUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequestUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthenticatedRequestUser }>();
    return req.user;
  },
);
