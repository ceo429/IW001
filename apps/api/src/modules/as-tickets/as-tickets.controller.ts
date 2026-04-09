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
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  asStatusSchema,
  createAsTicketSchema,
  transitionAsTicketSchema,
  updateAsTicketSchema,
  type CreateAsTicketDto,
  type TransitionAsTicketDto,
  type UpdateAsTicketDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { AsTicketsService } from './as-tickets.service';

const listQuerySchema = z.object({
  status: asStatusSchema.optional(),
  homeId: z.string().uuid().optional(),
});

@Controller('as-tickets')
export class AsTicketsController {
  constructor(private readonly tickets: AsTicketsService) {}

  @Get()
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('as-intake', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.tickets.list(query.status, query.homeId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('as-intake', 'read')
  findOne(@Param('id') id: string) {
    return this.tickets.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('as-intake', 'write')
  @Audit({ resource: 'as-ticket', action: 'create' })
  create(@Body(new ZodValidationPipe(createAsTicketSchema)) dto: CreateAsTicketDto) {
    return this.tickets.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('as-intake', 'write')
  @Audit({ resource: 'as-ticket', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAsTicketSchema)) dto: UpdateAsTicketDto,
  ) {
    return this.tickets.update(id, dto);
  }

  @Post(':id/transition')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('as-intake', 'write')
  @Audit({ resource: 'as-ticket', action: 'transition' })
  transition(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transitionAsTicketSchema)) dto: TransitionAsTicketDto,
  ) {
    return this.tickets.transition(id, dto.to);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('as-intake', 'delete')
  @Audit({ resource: 'as-ticket', action: 'delete', severity: 'high' })
  remove(@Param('id') id: string) {
    return this.tickets.remove(id);
  }
}
