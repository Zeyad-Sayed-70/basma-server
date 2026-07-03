import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandPublicResponseDto } from './dto/brand-public-response.dto';

@Injectable()
export class BrandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  private getInstanceId(): string {
    const instanceId = TenantContext.getInstanceId();
    if (!instanceId) {
      throw new ForbiddenException('Tenant context not found');
    }
    return instanceId;
  }

  async findBrand() {
    const instanceId = this.getInstanceId();
    const brand = await this.prisma.brand.findFirst({
      where: { instanceId },
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return {
      ...brand,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  async update(dto: UpdateBrandDto) {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.brand.findFirst({
      where: { instanceId },
    });
    if (!existing) {
      throw new NotFoundException('Brand not found');
    }

    if (dto.customDomain) {
      await this.tierFeatureService.requireFeature(instanceId, 'customDomain');
    }

    const brand = await this.prisma.brand.update({
      where: { id: existing.id },
      data: {
        ...(dto.primaryColor !== undefined && {
          primaryColor: dto.primaryColor,
        }),
        ...(dto.secondaryColor !== undefined && {
          secondaryColor: dto.secondaryColor,
        }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.customDomain !== undefined && {
          customDomain: dto.customDomain,
        }),
        ...(dto.whiteLabelEnabled !== undefined && {
          whiteLabelEnabled: dto.whiteLabelEnabled,
        }),
      },
    });

    return {
      ...brand,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  async uploadLogo(file: Express.Multer.File) {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.brand.findFirst({
      where: { instanceId },
    });
    if (!existing) {
      throw new NotFoundException('Brand not found');
    }

    if (existing.logoUrl) {
      const oldPath = existing.logoUrl;
      try {
        await this.minio.deleteObject(oldPath);
      } catch {
        // ignore if old file no longer exists
      }
    }

    const ext = file.originalname.split('.').pop() ?? 'png';
    const objectPath = `${instanceId}/logo/${Date.now()}.${ext}`;
    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const logoUrl = this.minio.getObjectUrl(objectPath);

    const brand = await this.prisma.brand.update({
      where: { id: existing.id },
      data: { logoUrl, logoFileSize: file.buffer.length },
    });

    return {
      ...brand,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  async removeLogo() {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.brand.findFirst({
      where: { instanceId },
    });
    if (!existing) {
      throw new NotFoundException('Brand not found');
    }

    if (existing.logoUrl) {
      try {
        await this.minio.deleteObject(existing.logoUrl);
      } catch {
        // ignore if file no longer exists
      }
    }

    const brand = await this.prisma.brand.update({
      where: { id: existing.id },
      data: { logoUrl: null, logoFileSize: null },
    });

    return {
      ...brand,
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString(),
    };
  }

  async findBySubdomain(subdomain: string): Promise<BrandPublicResponseDto> {
    const instance = await this.prisma.instance.findUnique({
      where: { subdomain },
      select: {
        name: true,
        brand: {
          select: {
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            fontFamily: true,
            whiteLabelEnabled: true,
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('Instance not found');
    }

    return {
      logoUrl: instance.brand?.logoUrl ?? null,
      primaryColor: instance.brand?.primaryColor ?? '#2563eb',
      secondaryColor: instance.brand?.secondaryColor ?? '#1e40af',
      fontFamily: instance.brand?.fontFamily ?? 'Cairo',
      whiteLabelEnabled: instance.brand?.whiteLabelEnabled ?? false,
      instanceName: instance.name,
    };
  }
}
