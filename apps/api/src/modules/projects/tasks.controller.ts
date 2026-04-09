import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
  type CreateTaskDto,
  type MoveTaskDto,
  type UpdateTaskDto,
} from '@iw001/shared';
import type { ProjectStatus } from '@prisma/client';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { Audit } from '../../common/interceptors/audit.decorator';
import { TasksService } from './tasks.service';

/**
 * Task endpoints are nested under /projects/:projectId/tasks for creation
 * (so the parent must exist) but top-level for updates/deletes (the task ID
 * is globally unique). That keeps the URL shape clear for each operation.
 */
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('projects/:projectId/tasks')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('projects', 'write')
  @Audit({ resource: 'task', action: 'create' })
  create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createTaskSchema)) dto: CreateTaskDto,
  ) {
    return this.tasks.create(projectId, dto);
  }

  @Patch('tasks/:id')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('projects', 'write')
  @Audit({ resource: 'task', action: 'update' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) dto: UpdateTaskDto,
  ) {
    return this.tasks.update(id, dto);
  }

  @Post('tasks/:id/move')
  @Roles('admin', 'manager', 'engineer')
  @RequirePermission('projects', 'write')
  @Audit({ resource: 'task', action: 'move' })
  move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveTaskSchema)) dto: MoveTaskDto,
  ) {
    return this.tasks.move(id, dto.to as ProjectStatus);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'manager')
  @RequirePermission('projects', 'delete')
  @Audit({ resource: 'task', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.tasks.remove(id);
  }
}
