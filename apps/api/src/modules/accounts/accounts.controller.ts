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
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountDto,
  type UpdateAccountDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @Roles('admin', 'manager')
  @RequirePermission('accounts', 'read')
  list() {
    return this.accounts.list();
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @RequirePermission('accounts', 'read')
  findOne(@Param('id') id: string) {
    return this.accounts.findOne(id);
  }

  @Post()
  @Roles('admin')
  @RequirePermission('accounts', 'write')
  @Audit({ resource: 'account', action: 'create' })
  create(@Body(new ZodValidationPipe(createAccountSchema)) dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @RequirePermission('accounts', 'write')
  @Audit({ resource: 'account', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAccountSchema)) dto: UpdateAccountDto,
  ) {
    return this.accounts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @RequirePermission('accounts', 'delete')
  @Audit({ resource: 'account', action: 'delete', severity: 'high' })
  remove(@Param('id') id: string) {
    return this.accounts.remove(id);
  }
}
