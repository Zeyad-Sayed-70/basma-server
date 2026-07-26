import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { YoutubeModule } from '../youtube/youtube.module';
import { AuthModule } from '../auth/auth.module';
import { StreamAuthGuard } from './stream-auth.guard';
import { StreamRateGuard } from './stream-rate.guard';

@Module({
  imports: [
    CoursesModule,
    MinioModule,
    YoutubeModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    BullModule.registerQueue(
      { name: 'video-jobs.upload' },
      { name: 'video-jobs.bundle' },
    ),
  ],
  controllers: [CurriculumController, ElementsController, ProgressController],
  providers: [
    CurriculumService,
    ElementsService,
    ProgressService,
    ProgressListener,
    SessionCompleteScheduler,
    StreamAuthGuard,
    StreamRateGuard,
  ],
  exports: [CurriculumService, ProgressService],
})
export class CurriculumModule {}
