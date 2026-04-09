import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { ProductsService } from './products.service';

const listQuerySchema = z.object({
  q: z.string().max(120).optional(),
});

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Roles('admin', 'manager', 'viewer', 'engineer')
  @RequirePermission('products', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.products.list(query.q);
  }
}
