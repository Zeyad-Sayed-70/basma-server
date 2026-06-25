import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    const ep = configService.getOrThrow<string>('MINIO_ENDPOINT');
    const [host, portStr] = ep.split(':');
    const port = portStr ? parseInt(portStr, 10) : 9000;
    const useSSL =
      configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.endpoint = ep;
    this.bucket = configService.getOrThrow<string>('MINIO_BUCKET');

    this.client = new Minio.Client({
      endPoint: host,
      port,
      useSSL,
      accessKey: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket "${this.bucket}"`);
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    objectPath: string,
    mimeType: string,
  ): Promise<string> {
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

  async deleteObject(objectPath: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectPath);
  }

  getObjectUrl(objectPath: string): string {
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}/${this.bucket}/${objectPath}`;
  }
}
