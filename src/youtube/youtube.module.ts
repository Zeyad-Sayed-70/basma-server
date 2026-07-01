import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { YoutubeController } from './youtube.controller';
import { OauthController } from './oauth.controller';
import { YoutubeService } from './youtube.service';
import { YtdlpService } from './ytdlp.service';
import { BundleService } from './bundle.service';
import { CookiesRefreshService } from './cookies.refresh.service';
import { CookiesRefreshScheduler } from './cookies.refresh.scheduler';
import { UploadProcessor } from './jobs/upload.processor';
import { BundleProcessor } from './jobs/bundle.processor';
import { VideoJobsProducer } from './jobs/video-jobs.producer';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [
    MinioModule,
    BullModule.registerQueue(
      { name: 'video-jobs.upload' },
      { name: 'video-jobs.bundle' },
    ),
  ],
  controllers: [YoutubeController, OauthController],
  providers: [
    YoutubeService,
    YtdlpService,
    BundleService,
    CookiesRefreshService,
    CookiesRefreshScheduler,
    UploadProcessor,
    BundleProcessor,
    VideoJobsProducer,
  ],
  exports: [VideoJobsProducer, YoutubeService, BundleService],
})
export class YoutubeModule {}
