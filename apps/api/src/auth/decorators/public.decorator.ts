import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'iw001:isPublic';

/**
 * Mark a route handler as public (no JWT required). The global JwtAuthGuard
 * reads this metadata and bypasses authentication.
 *
 *   @Public()
 *   @Post('login')
 *   login(...) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
