import { SetMetadata } from '@nestjs/common';
import type { RoleId } from '@iw001/shared';

export const ROLES_KEY = 'iw001:roles';

/**
 * Require one of the listed roles to access a route. Works together with
 * RolesGuard, which also respects the role hierarchy:
 *   admin > manager > engineer > viewer
 *
 *   @Roles('admin', 'manager')
 *   @Post('quotes')
 */
export const Roles = (...roles: RoleId[]) => SetMetadata(ROLES_KEY, roles);
