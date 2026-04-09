import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('customers', 'read')
  list() {
    return this.customers.listForPicker();
  }

  @Get(':id')
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('customers', 'read')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }
}
