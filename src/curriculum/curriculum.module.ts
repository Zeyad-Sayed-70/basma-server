import { Module } from '@nestjs/common';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';
import { ElementsController } from './elements.controller';
import { ElementsService } from './elements.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ProgressListener } from './progress.listener';
import { SessionCompleteScheduler } from './session-complete.scheduler';
import { CoursesModule } from '../courses/courses.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [CoursesModule, MinioModule],
  controllers: [CurriculumController, ElementsController, ProgressController],
  providers: [
    CurriculumService,
    ElementsService,
    ProgressService,
    ProgressListener,
    SessionCompleteScheduler,
  ],
  exports: [CurriculumService, ProgressService],
})
export class CurriculumModule {}
