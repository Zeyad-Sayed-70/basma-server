import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BundleService } from '../bundle.service';
import { CookiesRefreshService } from '../cookies.refresh.service';
import type { BundleJobData } from './video-jobs.producer';
import type { Prisma } from '@prisma/client';

@Injectable()
@Processor('video-jobs.bundle')
export class BundleProcessor extends WorkerHost {
  private readonly logger = new Logger(BundleProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bundleService: BundleService,
    private readonly cookiesRefresh: CookiesRefreshService,
  ) {
    super();
  }

  async process(job: Job<BundleJobData>) {
    const { elementId, youtubeVideoId } = job.data;

    try {
      const videoJob = await this.prisma.videoJob.findFirst({
        where: { elementId },
      });

      if (!videoJob || videoJob.status === 'CANCELLED') {
        this.logger.log(`bundle.cancelled elementId=${elementId}`);
        return;
      }

      const cookiesStatus = this.cookiesRefresh.getStatus();
      this.logger.log(
        `bundle.started elementId=${elementId} ytId=${youtubeVideoId} cookiesAgeSec=${cookiesStatus.ageSec}`,
      );

      const url = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
      const result = await this.bundleService.build(url);

      if (result.bundles.length === 0) {
        throw new Error(
          'No downloadable video formats found. ' +
            'The video may be private, removed, region-blocked, or DRM-protected.',
        );
      }

      const bundleJson = {
        bundles: result.bundles,
        preferredContainer: result.preferredContainer,
      } as unknown as Prisma.InputJsonValue;
      const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);

      await this.prisma.videoJob.updateMany({
        where: { elementId },
        data: {
          bundleJson,
          bundleExpiresAt: expiresAt,
          status: 'COMPLETED',
          finishedAt: new Date(),
        },
      });

      this.logger.log(
        `bundle.success elementId=${elementId} count=${result.bundles.length}`,
      );
    } catch (err) {
      const msg = (err as Error).message;
      const isCookiesIssue =
        msg.includes('Sign in') ||
        msg.includes('Private video') ||
        msg.includes('HTTP Error 403');

      this.logger.warn(
        `bundle.failed elementId=${elementId} msg=${msg} cookieIssue=${isCookiesIssue}`,
      );

      if (isCookiesIssue) {
        this.logger.log('bundle.force_cookie_refresh');
        await this.cookiesRefresh.refresh();
      }

      const retryAttempt = job.attemptsMade ?? 0;
      if (retryAttempt < 2) {
        throw err;
      }

      await this.prisma.videoJob.updateMany({
        where: { elementId },
        data: {
          status: 'FAILED',
          error: msg,
          finishedAt: new Date(),
        },
      });
    }
  }
}
