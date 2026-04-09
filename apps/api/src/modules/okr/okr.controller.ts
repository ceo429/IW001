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
  createKeyResultSchema,
  createObjectiveSchema,
  okrPeriodSchema,
  updateKeyResultSchema,
  updateObjectiveSchema,
  type CreateKeyResultDto,
  type CreateObjectiveDto,
  type UpdateKeyResultDto,
  type UpdateObjectiveDto,
} from '@iw001/shared';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { OkrService } from './okr.service';

const listQuerySchema = z.object({
  period: okrPeriodSchema.optional(),
});

@Controller('okr')
export class OkrController {
  constructor(private readonly okr: OkrService) {}

  // ---- objectives ----

  @Get('objectives')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('okr', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.okr.listObjectives(query.period);
  }

  @Get('objectives/:id')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('okr', 'read')
  findOne(@Param('id') id: string) {
    return this.okr.findOne(id);
  }

  @Post('objectives')
  @Roles('admin', 'manager')
  @RequirePermission('okr', 'write')
  @Audit({ resource: 'okr-objective', action: 'create' })
  create(@Body(new ZodValidationPipe(createObjectiveSchema)) dto: CreateObjectiveDto) {
    return this.okr.createObjective(dto);
  }

  @Patch('objectives/:id')
  @Roles('admin', 'manager')
  @RequirePermission('okr', 'write')
  @Audit({ resource: 'okr-objective', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateObjectiveSchema)) dto: UpdateObjectiveDto,
  ) {
    return this.okr.updateObjective(id, dto);
  }

  @Delete('objectives/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('okr', 'delete')
  @Audit({ resource: 'okr-objective', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.okr.removeObjective(id);
  }

  // ---- key results ----

  @Post('objectives/:objectiveId/key-results')
  @Roles('admin', 'manager')
  @RequirePermission('okr', 'write')
  @Audit({ resource: 'okr-key-result', action: 'create' })
  addKeyResult(
    @Param('objectiveId') objectiveId: string,
    @Body(new ZodValidationPipe(createKeyResultSchema)) dto: CreateKeyResultDto,
  ) {
    return this.okr.addKeyResult(objectiveId, dto);
  }

  @Patch('key-results/:id')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('okr', 'write')
  @Audit({ resource: 'okr-key-result', action: 'update' })
  updateKeyResult(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateKeyResultSchema)) dto: UpdateKeyResultDto,
  ) {
    return this.okr.updateKeyResult(id, dto);
  }

  @Delete('key-results/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('okr', 'delete')
  @Audit({ resource: 'okr-key-result', action: 'delete' })
  removeKeyResult(@Param('id') id: string) {
    return this.okr.removeKeyResult(id);
  }
}
