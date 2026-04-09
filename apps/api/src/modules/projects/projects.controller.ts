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
  createProjectSchema,
  projectStatusSchema,
  updateProjectSchema,
  type CreateProjectDto,
  type UpdateProjectDto,
} from '@iw001/shared';
import type { ProjectStatus } from '@prisma/client';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { ProjectsService } from './projects.service';

const listQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
});

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('projects', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<typeof listQuerySchema>) {
    return this.projects.list(query.status as ProjectStatus | undefined, query.customerId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'engineer', 'viewer')
  @RequirePermission('projects', 'read')
  findOne(@Param('id') id: string) {
    return this.projects.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('projects', 'write')
  @Audit({ resource: 'project', action: 'create' })
  create(@Body(new ZodValidationPipe(createProjectSchema)) dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('projects', 'write')
  @Audit({ resource: 'project', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) dto: UpdateProjectDto,
  ) {
    return this.projects.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('projects', 'delete')
  @Audit({ resource: 'project', action: 'delete', severity: 'high' })
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }
}
