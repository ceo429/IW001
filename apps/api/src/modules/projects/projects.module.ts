import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { TasksController } from './tasks.controller';
import { ProjectsService } from './projects.service';
import { TasksService } from './tasks.service';

@Module({
  controllers: [ProjectsController, TasksController],
  providers: [ProjectsService, TasksService],
  exports: [ProjectsService, TasksService],
})
export class ProjectsModule {}
