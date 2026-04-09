import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  type CreateAnnouncementDto,
  type UpdateAnnouncementDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/decorators/current-user.decorator';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('announcements', 'read')
  list() {
    return this.announcements.list();
  }

  @Get(':id')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('announcements', 'read')
  findOne(@Param('id') id: string) {
    return this.announcements.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @RequirePermission('announcements', 'write')
  @Audit({ resource: 'announcement', action: 'create' })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body(new ZodValidationPipe(createAnnouncementSchema)) dto: CreateAnnouncementDto,
  ) {
    return this.announcements.create(user.id, dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @RequirePermission('announcements', 'write')
  @Audit({ resource: 'announcement', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAnnouncementSchema)) dto: UpdateAnnouncementDto,
  ) {
    return this.announcements.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('announcements', 'delete')
  @Audit({ resource: 'announcement', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.announcements.remove(id);
  }
}
