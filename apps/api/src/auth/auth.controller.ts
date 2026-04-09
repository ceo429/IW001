import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  loginSchema,
  changePasswordSchema,
  type LoginDto,
  type ChangePasswordDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser, AuthenticatedRequestUser } from './decorators/current-user.decorator';

const REFRESH_COOKIE_NAME = 'rt';
const REFRESH_COOKIE_PATH = '/v1/auth/refresh';

/**
 * Authentication routes. All mutations are rate-limited at the controller
 * level; the global throttler covers everything else at a looser limit.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ---- login (public, tight rate limit) ----

  @Public()
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.login(dto, {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });

    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);

    return { accessToken: tokens.accessToken, user };
  }

  // ---- refresh (public, reads httpOnly cookie) ----

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    const tokens = await this.auth.refresh(token, {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });

    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);

    return { accessToken: tokens.accessToken };
  }

  // ---- logout ----

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  // ---- me ----

  @Get('me')
  me(@CurrentUser() user: AuthenticatedRequestUser) {
    return { user };
  }

  // ---- change password ----

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(user.id, dto);
  }

  // ---- helpers ----

  private setRefreshCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: expiresAt,
    });
  }
}
