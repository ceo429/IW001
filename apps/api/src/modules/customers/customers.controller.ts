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
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerDto,
  type UpdateCustomerDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { CustomersService } from './customers.service';

const listQuerySchema = z.object({
  q: z.string().max(120).optional(),
  /**
   * `mode=picker` returns the narrow shape used by the quote editor
   * customer dropdown; default returns the full shape with counts.
   */
  mode: z.enum(['picker', 'full']).default('full'),
});

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('customers', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    if (query.mode === 'picker') {
      return this.customers.listForPicker();
    }
    return this.customers.listWithCounts(query.q);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('customers', 'read')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @RequirePermission('customers', 'write')
  @Audit({ resource: 'customer', action: 'create' })
  create(@Body(new ZodValidationPipe(createCustomerSchema)) dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @RequirePermission('customers', 'write')
  @Audit({ resource: 'customer', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) dto: UpdateCustomerDto,
  ) {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @RequirePermission('customers', 'delete')
  @Audit({ resource: 'customer', action: 'delete', severity: 'high' })
  remove(@Param('id') id: string) {
    return this.customers.remove(id);
  }
}
