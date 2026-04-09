import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  createQuoteSchema,
  listQuotesQuerySchema,
  transitionQuoteSchema,
  updateQuoteSchema,
  type CreateQuoteDto,
  type ListQuotesQuery,
  type TransitionQuoteDto,
  type UpdateQuoteDto,
} from '@iw001/shared';
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
  list(@Query(new ZodValidationPipe(listQuotesQuerySchema)) query: ListQuotesQuery) {
    return this.quotes.list(query);
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

  @Patch(':id')
  @Roles('admin', 'manager')
  @RequirePermission('quotes', 'write')
  @Audit({ resource: 'quote', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateQuoteSchema)) dto: UpdateQuoteDto,
  ) {
    return this.quotes.update(id, dto);
  }

  /**
   * Single state-transition endpoint for all of send / approve / reject /
   * cancel / convert-to-order. The service enforces the state machine, so
   * the client can't smuggle a forbidden move.
   */
  @Post(':id/transition')
  @Roles('admin', 'manager')
  @RequirePermission('quotes', 'write')
  @Audit({ resource: 'quote', action: 'transition' })
  transition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionQuoteSchema)) dto: TransitionQuoteDto,
  ) {
    return this.quotes.transition(id, dto.to);
  }
}
