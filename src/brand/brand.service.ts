import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandPublicResponseDto } from './dto/brand-public-response.dto';
import { randomBytes } from 'node:crypto';
import { Resolver } from 'node:dns/promises';

const RESERVED_DOMAINS = new Set([
  'basma.app',
  'www.basma.app',
  'localhost',
  'basma.local',
  'basma.test',
]);

const DOMAIN_REGEX =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;

@Injectable()
export class BrandService {
  private readonly logger = new Logger(BrandService.name);
  private readonly appBaseDomain: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly tierFeatureService: TierFeatureService,
    private readonly configService: ConfigService,
  ) {
    this.appBaseDomain = this.configService.get<string>(
      'APP_BASE_DOMAIN',
      'basma.app',
    );
  }

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

    if (dto.customDomain !== undefined && dto.customDomain !== null) {
      const domain = dto.customDomain.trim().toLowerCase();

      if (domain) {
        await this.tierFeatureService.requireFeature(
          instanceId,
          'customDomain',
        );
        this.validateDomain(domain);

        const conflicting = await this.prisma.brand.findFirst({
          where: { customDomain: domain, instanceId: { not: instanceId } },
        });
        if (conflicting) {
          throw new BadRequestException(
            'This domain is already taken by another instance',
          );
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
            customDomain: domain,
            customDomainVerifyToken: randomBytes(16).toString('hex'),
            customDomainVerifiedAt: null,
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
          customDomain: null,
          customDomainVerifyToken: null,
          customDomainVerifiedAt: null,
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

  async verifyDomain() {
    const instanceId = this.getInstanceId();
    const brand = await this.prisma.brand.findFirst({ where: { instanceId } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    if (!brand.customDomain || !brand.customDomainVerifyToken) {
      throw new BadRequestException('No custom domain configured to verify');
    }
    if (brand.customDomainVerifiedAt) {
      return {
        verified: true,
        customDomain: brand.customDomain,
        verifiedAt: brand.customDomainVerifiedAt.toISOString(),
      };
    }

    const txtHost = `_basma.${brand.customDomain}`;
    try {
      const resolver = new Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1']);
      const records = await resolver.resolveTxt(txtHost);
      const tokenFound = records.some((record) =>
        record.some((chunk) => chunk.trim() === brand.customDomainVerifyToken),
      );
      if (!tokenFound) {
        throw new BadRequestException(
          `DNS verification failed. Ensure a TXT record at "${txtHost}" with value "${brand.customDomainVerifyToken}" exists and has propagated.`,
        );
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        `Could not query DNS for "${txtHost}". Ensure the domain is resolvable and the TXT record has been added. (${(err as Error).message})`,
      );
    }

    const updated = await this.prisma.brand.update({
      where: { id: brand.id },
      data: { customDomainVerifiedAt: new Date() },
    });

    this.logger.log(
      `Domain ${brand.customDomain} verified for instance ${instanceId}`,
    );

    return {
      verified: true,
      customDomain: updated.customDomain,
      verifiedAt: updated.customDomainVerifiedAt!.toISOString(),
    };
  }

  async getDomainStatus() {
    const instanceId = this.getInstanceId();
    const brand = await this.prisma.brand.findFirst({ where: { instanceId } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return {
      customDomain: brand.customDomain ?? null,
      verified: !!brand.customDomainVerifiedAt,
      verifiedAt: brand.customDomainVerifiedAt?.toISOString() ?? null,
      verifyToken: brand.customDomainVerifyToken ?? null,
      dnsInstructions: brand.customDomainVerifyToken
        ? `Add a TXT record for "_basma.${brand.customDomain}" with value "${brand.customDomainVerifyToken}"`
        : null,
    };
  }

  async removeDomain() {
    const instanceId = this.getInstanceId();
    const brand = await this.prisma.brand.findFirst({ where: { instanceId } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const updated = await this.prisma.brand.update({
      where: { id: brand.id },
      data: {
        customDomain: null,
        customDomainVerifyToken: null,
        customDomainVerifiedAt: null,
      },
    });

    this.logger.log(`Custom domain removed for instance ${instanceId}`);

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
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

  private validateDomain(domain: string): void {
    if (RESERVED_DOMAINS.has(domain)) {
      throw new BadRequestException(
        `"${domain}" is a reserved domain and cannot be used`,
      );
    }
    if (domain.endsWith('.' + this.appBaseDomain)) {
      throw new BadRequestException(
        `Subdomains of ${this.appBaseDomain} are not allowed as custom domains. Use the subdomain feature instead.`,
      );
    }
    if (!DOMAIN_REGEX.test(domain)) {
      throw new BadRequestException(
        'Invalid domain format. Use a valid fully-qualified domain name (e.g., myschool.com).',
      );
    }
  }
}
