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
  createAsGuideSchema,
  deviceTypeSchema,
  updateAsGuideSchema,
  type CreateAsGuideDto,
  type UpdateAsGuideDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { AsGuidesService } from './as-guides.service';

const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  deviceType: deviceTypeSchema.optional(),
});

@Controller('as-guides')
export class AsGuidesController {
  constructor(private readonly guides: AsGuidesService) {}

  @Get()
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('as-guide', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.guides.list(query.q, query.deviceType);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('as-guide', 'read')
  findOne(@Param('id') id: string) {
    return this.guides.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('as-guide', 'write')
  @Audit({ resource: 'as-guide', action: 'create' })
  create(@Body(new ZodValidationPipe(createAsGuideSchema)) dto: CreateAsGuideDto) {
    return this.guides.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('as-guide', 'write')
  @Audit({ resource: 'as-guide', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAsGuideSchema)) dto: UpdateAsGuideDto,
  ) {
    return this.guides.update(id, dto);
  }

  @Post(':id/increment')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('as-guide', 'write')
  incrementCase(@Param('id') id: string) {
    return this.guides.incrementCaseCount(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('as-guide', 'delete')
  @Audit({ resource: 'as-guide', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.guides.remove(id);
  }
}
