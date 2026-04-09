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
  createProductSchema,
  updateProductSchema,
  type CreateProductDto,
  type UpdateProductDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { ProductsService } from './products.service';

const listQuerySchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(40).optional(),
});

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('products', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.products.list(query.q, query.category);
  }

  @Get('overview')
  @Roles('admin', 'manager', 'viewer')
  @RequirePermission('products', 'read')
  overview() {
    return this.products.overview();
  }

  @Get(':id')
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('products', 'read')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @RequirePermission('products', 'write')
  @Audit({ resource: 'product', action: 'create' })
  create(@Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @RequirePermission('products', 'write')
  @Audit({ resource: 'product', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductDto,
  ) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @RequirePermission('products', 'delete')
  @Audit({ resource: 'product', action: 'delete', severity: 'high' })
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
