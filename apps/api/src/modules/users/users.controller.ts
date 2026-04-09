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
import { createUserSchema, updateUserSchema, type CreateUserDto, type UpdateUserDto } from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('admin', 'manager')
  @RequirePermission('admin', 'read')
  list() {
    return this.users.list();
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @RequirePermission('admin', 'read')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Roles('admin')
  @RequirePermission('admin', 'write')
  @Audit({ resource: 'user', action: 'create', severity: 'high' })
  create(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @RequirePermission('admin', 'write')
  @Audit({ resource: 'user', action: 'update', severity: 'high' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.users.update(id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @RequirePermission('admin', 'write')
  @Audit({ resource: 'user', action: 'reset-password', severity: 'high' })
  resetPassword(@Param('id') id: string) {
    return this.users.resetPassword(id);
  }

  @Delete(':id')
  @Roles('admin')
  @RequirePermission('admin', 'delete')
  @Audit({ resource: 'user', action: 'soft-delete', severity: 'high' })
  remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedRequestUser,
  ) {
    return this.users.softDelete(id, actor.id);
  }
}
