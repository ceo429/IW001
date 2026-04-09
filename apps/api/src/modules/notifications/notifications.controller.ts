import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  createNotificationSchema,
  notifSeveritySchema,
  type CreateNotificationDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

const listQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  severity: notifSeveritySchema.optional(),
});

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('alarms', 'read')
  list(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>,
  ) {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('alarms', 'read')
  unreadCount(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Post()
  @Roles('admin', 'manager')
  @RequirePermission('alarms', 'write')
  @Audit({ resource: 'notification', action: 'create' })
  create(@Body(new ZodValidationPipe(createNotificationSchema)) dto: CreateNotificationDto) {
    return this.notifications.create(dto);
  }

  @Post(':id/read')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('alarms', 'read')
  markRead(@Param('id') id: string) {
    return this.notifications.markRead(id);
  }

  @Post('read-all')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('alarms', 'read')
  markAllRead(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @RequirePermission('alarms', 'delete')
  @Audit({ resource: 'notification', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.notifications.remove(id);
  }
}
