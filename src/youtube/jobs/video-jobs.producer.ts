import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

export interface UploadJobData {
  elementId: string;
  instanceId: string;
  youtubeVideoId?: string;
}

export interface BundleJobData {
  elementId: string;
  youtubeVideoId: string;
  retryAttempt?: number;
}

@Injectable()
export class VideoJobsProducer {
  private readonly logger = new Logger(VideoJobsProducer.name);

  constructor(
    @InjectQueue('video-jobs.upload') private readonly uploadQueue: Queue,
    @InjectQueue('video-jobs.bundle') private readonly bundleQueue: Queue,
  ) {}

  async enqueueUpload(elementId: string, instanceId: string) {
    const jobId = `upload-${elementId}`;
    await this.uploadQueue.add(
      'process',
      { elementId, instanceId } satisfies UploadJobData,
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    this.logger.log(`upload.enqueued elementId=${elementId} jobId=${jobId}`);
  }

  async enqueueBundle(elementId: string, youtubeVideoId: string) {
    const jobId = `bundle-${elementId}-${Date.now()}`;
    await this.bundleQueue.add(
      'process',
      { elementId, youtubeVideoId } satisfies BundleJobData,
      {
        jobId,
        attempts: 6,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    this.logger.log(
      `bundle.enqueued elementId=${elementId} ytId=${youtubeVideoId} jobId=${jobId}`,
    );
  }
}
