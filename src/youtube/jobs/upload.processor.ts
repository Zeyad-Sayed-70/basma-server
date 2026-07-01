import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../minio/minio.service';
import { YoutubeService } from '../youtube.service';
import { VideoJobsProducer } from './video-jobs.producer';
import type { UploadJobData } from './video-jobs.producer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
@Processor('video-jobs.upload')
export class UploadProcessor extends WorkerHost {
  private readonly logger = new Logger(UploadProcessor.name);
  private readonly tmpDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly youtubeService: YoutubeService,
    private readonly producer: VideoJobsProducer,
    private readonly config: ConfigService,
  ) {
    super();
    this.tmpDir =
      this.config.get<string>('YT_TEMP_DIR') ??
      path.join(os.tmpdir(), 'basma-yt-uploads');
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  async process(job: Job<UploadJobData>) {
    const { elementId, instanceId } = job.data;

    try {
      await this.prisma.videoJob.updateMany({
        where: { elementId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });
      this.logger.log(`upload.started elementId=${elementId}`);

      const videoJob = await this.prisma.videoJob.findFirst({
        where: { elementId },
      });

      if (!videoJob || videoJob.status === 'CANCELLED') {
        this.logger.log(`upload.cancelled elementId=${elementId}`);
        return;
      }

      const fileObjectKey = videoJob.fileObjectKey;
      if (!fileObjectKey) {
        throw new Error('No fileObjectKey for this video job');
      }

      const { youtube } = await this.youtubeService.createYoutubeClient();

      const tempFile = path.join(this.tmpDir, `${elementId}-${Date.now()}.mp4`);

      try {
        const bucket = this.config.getOrThrow<string>('MINIO_BUCKET');
        const ep = this.config.getOrThrow<string>('MINIO_ENDPOINT');
        const [host, portStr] = ep.split(':');
        const port = portStr ? parseInt(portStr, 10) : 9000;

        const minioClient = new Minio.Client({
          endPoint: host,
          port,
          useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
          accessKey: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
          secretKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
        });

        await new Promise<void>((resolve, reject) => {
          (minioClient as any).fGetObject(
            bucket,
            fileObjectKey,
            tempFile,

            (err: any) => {
              if (err) reject(new Error(String(err)));
              else resolve();
            },
          );
        });

        const element = await this.prisma.curriculumElement.findFirst({
          where: { id: elementId },
          include: { curriculum: true },
        });

        const title = element?.title ?? videoJob.id;
        const description = `Uploaded from Basma — ${instanceId}`;

        const res = await youtube.videos.insert({
          part: ['snippet', 'status'],
          notifySubscribers: false,
          requestBody: {
            snippet: { title, description },
            status: { privacyStatus: 'private' },
          },
          media: {
            body: fs.createReadStream(tempFile),
          },
        });

        const youtubeVideoId = res.data.id;
        if (!youtubeVideoId)
          throw new Error('YouTube upload returned no video ID');

        this.logger.log(
          `upload.success elementId=${elementId} ytId=${youtubeVideoId}`,
        );

        this.minioService.deleteObject(fileObjectKey).catch(() => {
          this.logger.warn(`upload.minio_cleanup_skipped key=${fileObjectKey}`);
        });

        await this.prisma.videoJob.updateMany({
          where: { elementId },
          data: { youtubeVideoId },
        });

        await this.producer.enqueueBundle(elementId, youtubeVideoId);
      } finally {
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch {
          /* best-effort */
        }
      }
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.warn(`upload.failed elementId=${elementId} msg=${msg}`);

      await this.prisma.videoJob.updateMany({
        where: { elementId },
        data: {
          status: 'FAILED',
          error: msg,
          attempts: { increment: 1 },
          finishedAt: new Date(),
        },
      });

      throw err;
    }
  }
}
