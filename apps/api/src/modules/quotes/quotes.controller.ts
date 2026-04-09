import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { createQuoteSchema, type CreateQuoteDto } from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import {
  CurrentUser,
  type AuthenticatedRequestUser,
} from '../../auth/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  @Roles('admin', 'manager', 'viewer')
  @RequirePermission('quotes', 'read')
  list() {
    return this.quotes.list();
  }

  @Get(':id')
  @Roles('admin', 'manager', 'viewer')
  @RequirePermission('quotes', 'read')
  findOne(@Param('id') id: string) {
    return this.quotes.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @RequirePermission('quotes', 'write')
  @Audit({ resource: 'quote', action: 'create' })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body(new ZodValidationPipe(createQuoteSchema)) dto: CreateQuoteDto,
  ) {
    return this.quotes.create(user.id, dto);
  }
}
