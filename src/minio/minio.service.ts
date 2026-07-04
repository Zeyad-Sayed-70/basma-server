import {
  Injectable,
  OnModuleInit,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { TenantContext } from '../common/context/tenant-context';
import { PrismaService } from '../prisma/prisma.service';
import { TIER_LIMITS } from '../common/constants/tier-limits';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly publicUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tierFeatureService: TierFeatureService,
  ) {
    const ep = configService.getOrThrow<string>('MINIO_ENDPOINT');
    const [host, portStr] = ep.split(':');
    const port = portStr ? parseInt(portStr, 10) : 9000;
    const useSSL =
      configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.endpoint = ep;
    this.bucket = configService.getOrThrow<string>('MINIO_BUCKET');
    this.publicUrl = configService.get<string>(
      'MINIO_PUBLIC_URL',
      `http://${this.endpoint}/${this.bucket}`,
    );

    this.client = new Minio.Client({
      endPoint: host,
      port,
      useSSL,
      accessKey: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  private minioReady = false;

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket "${this.bucket}"`);
      }

      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      this.logger.log(`Set public-read policy on bucket "${this.bucket}"`);

      this.minioReady = true;
    } catch (error) {
      this.logger.warn(
        `MinIO not available at ${this.endpoint} — file uploads will fail until it's started. ${(error as Error).message}`,
      );
    }
  }

  private checkReady() {
    if (!this.minioReady) {
      throw new Error('MinIO is not available');
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    objectPath: string,
    mimeType: string,
  ): Promise<string> {
    this.checkReady();

    const instanceId = TenantContext.getInstanceId();
    if (instanceId) {
      await this.checkStorageLimit(instanceId, buffer.length);
    }

    await this.client.putObject(
      this.bucket,
      objectPath,
      buffer,
      buffer.length,
      {
        'Content-Type': mimeType,
      },
    );
    return objectPath;
  }

  private async checkStorageLimit(instanceId: string, newFileSize: number) {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: { tier: true },
    });
    if (!instance) return;

    const limitMB = TIER_LIMITS[instance.tier].fileStorageMB;
    if (limitMB === Infinity) return;

    const [
      { _sum: agentSum },
      { _sum: videoSum },
      { _sum: fileSum },
      { _sum: imageSum },
      { _sum: brandSum },
      { _sum: chatSum },
      { _sum: submissionSum },
      { _sum: courseSum },
    ] = await Promise.all([
      this.prisma.agentSpaceFile.aggregate({
        where: { instanceId },
        _sum: { fileSize: true },
      }),
      this.prisma.curriculumVideo.aggregate({
        where: { instanceId },
        _sum: { fileSize: true },
      }),
      this.prisma.curriculumFile.aggregate({
        where: { instanceId },
        _sum: { fileSize: true },
      }),
      this.prisma.curriculumImage.aggregate({
        where: { instanceId },
        _sum: { fileSize: true },
      }),
      this.prisma.brand.aggregate({
        where: { instanceId },
        _sum: { logoFileSize: true },
      }),
      this.prisma.chatMessage.aggregate({
        where: { instanceId },
        _sum: { fileSize: true },
      }),
      this.prisma.studentAssignmentSubmission.aggregate({
        where: { instanceId },
        _sum: { fileSize: true },
      }),
      this.prisma.course.aggregate({
        where: { instanceId },
        _sum: { imageFileSize: true },
      }),
    ]);

    const totalBytes =
      (agentSum.fileSize ?? 0) +
      (videoSum.fileSize ?? 0) +
      (fileSum.fileSize ?? 0) +
      (imageSum.fileSize ?? 0) +
      (brandSum.logoFileSize ?? 0) +
      (chatSum.fileSize ?? 0) +
      (submissionSum.fileSize ?? 0) +
      (courseSum.imageFileSize ?? 0);

    const limitBytes = limitMB * 1048576;

    if (totalBytes + newFileSize > limitBytes) {
      throw new ForbiddenException(
        `File storage limit exceeded (${limitMB} MB). Delete existing files or upgrade your plan.`,
      );
    }
  }

  async deleteObject(objectPath: string): Promise<void> {
    this.checkReady();
    await this.client.removeObject(this.bucket, objectPath);
  }

  getObjectUrl(objectPath: string): string {
    return `${this.publicUrl}/${objectPath}`;
  }
}
