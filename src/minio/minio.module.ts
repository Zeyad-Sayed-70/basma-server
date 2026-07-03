import { Module, Global } from '@nestjs/common';
import { MinioService } from './minio.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Global()
@Module({
  imports: [PrismaModule, CommonModule],
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
