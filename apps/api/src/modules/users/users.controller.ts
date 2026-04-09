import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { createUserSchema, updateUserSchema, type CreateUserDto, type UpdateUserDto } from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
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
}
