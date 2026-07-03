import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';
import { UpdateLandingDto } from './dto/update-landing.dto';
import { LandingPublicResponseDto } from './dto/landing-public-response.dto';
import { LandingContentDto } from './dto/landing-content.dto';
import { Prisma, LandingPageStatus } from '@prisma/client';

function defaultContent(instanceName: string): Prisma.JsonObject {
  return {
    template: 'classic-academy',
    hero: {
      eyebrow: '',
      title: instanceName,
      subtitle: '',
      primaryCta: { label: 'سجل الآن', type: 'REGISTER' },
    },
    featuredCourses: {
      mode: 'LATEST',
      courseIds: [],
    },
  };
}

@Injectable()
export class LandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  private validateContent(content: LandingContentDto): {
    canPublish: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!content.hero?.title?.trim()) {
      errors.push('Hero title is required');
    }

    if (!content.hero?.primaryCta?.label?.trim()) {
      errors.push('Hero primary CTA label is required');
    }

    if (
      content.hero?.primaryCta?.type === 'CUSTOM_URL' &&
      !content.hero?.primaryCta?.href?.trim()
    ) {
      errors.push('Custom URL CTA requires an href');
    }

    if (
      content.featuredCourses?.mode === 'MANUAL' &&
      !content.featuredCourses?.courseIds?.length
    ) {
      warnings.push('Manual course mode selected but no courses chosen');
    }

    return {
      canPublish: errors.length === 0,
      warnings,
      errors,
    };
  }

  private async resolveInstanceName(instanceId: string): Promise<string> {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: { name: true },
    });
    return instance?.name ?? 'My Academy';
  }

  async getOrCreateForCurrentInstance() {
    const instanceId = this.getInstanceId();
    let page = await this.prisma.landingPage.findUnique({
      where: { instanceId },
    });

    if (!page) {
      const name = await this.resolveInstanceName(instanceId);
      page = await this.prisma.landingPage.create({
        data: {
          instanceId,
          content: defaultContent(name),
        },
      });
    }

    return this.toResponseDto(page);
  }

  async updateForCurrentInstance(dto: UpdateLandingDto) {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.landingPage.findUnique({
      where: { instanceId },
    });
    if (!existing) throw new NotFoundException('Landing page not found');

    if (dto.content?.featuredCourses?.mode === 'MANUAL') {
      await this.validateCourseIds(
        instanceId,
        dto.content.featuredCourses.courseIds,
      );
    }

    const page = await this.prisma.landingPage.update({
      where: { id: existing.id },
      data: {
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle }),
        ...(dto.seoDescription !== undefined && {
          seoDescription: dto.seoDescription,
        }),
        ...(dto.ogImageUrl !== undefined && { ogImageUrl: dto.ogImageUrl }),
        ...(dto.content !== undefined && {
          content: dto.content as unknown as Prisma.JsonObject,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    return this.toResponseDto(page);
  }

  async publishForCurrentInstance() {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.landingPage.findUnique({
      where: { instanceId },
    });
    if (!existing) throw new NotFoundException('Landing page not found');

    const validation = this.validateContent(
      existing.content as unknown as LandingContentDto,
    );
    if (!validation.canPublish) {
      throw new BadRequestException({
        message: 'Cannot publish landing page',
        errors: validation.errors,
      });
    }

    const page = await this.prisma.landingPage.update({
      where: { id: existing.id },
      data: {
        status: LandingPageStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    return this.toResponseDto(page);
  }

  async unpublishForCurrentInstance() {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.landingPage.findUnique({
      where: { instanceId },
    });
    if (!existing) throw new NotFoundException('Landing page not found');

    const page = await this.prisma.landingPage.update({
      where: { id: existing.id },
      data: { status: LandingPageStatus.DRAFT },
    });

    return this.toResponseDto(page);
  }

  async resetForCurrentInstance() {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.landingPage.findUnique({
      where: { instanceId },
    });
    if (!existing) throw new NotFoundException('Landing page not found');

    const name = await this.resolveInstanceName(instanceId);
    const page = await this.prisma.landingPage.update({
      where: { id: existing.id },
      data: {
        content: defaultContent(name),
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        status: LandingPageStatus.DRAFT,
      },
    });

    return this.toResponseDto(page);
  }

  async uploadMedia(file: Express.Multer.File): Promise<{ url: string }> {
    const instanceId = this.getInstanceId();

    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: jpg, png, webp, svg',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const ext = file.originalname.split('.').pop() ?? 'png';
    const objectPath = `${instanceId}/landing/${Date.now()}.${ext}`;
    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const url = this.minio.getObjectUrl(objectPath);

    return { url };
  }

  async findPublicBySubdomain(
    subdomain: string,
  ): Promise<LandingPublicResponseDto> {
    const instance = await this.prisma.instance.findUnique({
      where: { subdomain },
      include: {
        brand: true,
        landingPage: true,
        groups: {
          include: {
            courses: {
              include: {
                _count: { select: { enrollments: true } },
              },
            },
            _count: { select: { students: true } },
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('Instance not found');
    }

    if (
      !instance.landingPage ||
      instance.landingPage.status !== LandingPageStatus.PUBLISHED
    ) {
      throw new NotFoundException('Landing page not found or not published');
    }

    const brand = instance.brand;
    const landing = instance.landingPage;

    const courses = instance.groups.flatMap((g) =>
      g.courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        groupId: g.id,
        groupName: g.name,
        registrationMode: g.registrationMode,
        studentCount: c._count.enrollments,
      })),
    );

    return {
      instance: {
        id: instance.id,
        name: instance.name,
        subdomain: instance.subdomain,
        customDomain: brand?.customDomain ?? null,
      },
      brand: {
        logoUrl: brand?.logoUrl ?? null,
        primaryColor: brand?.primaryColor ?? '#2563eb',
        secondaryColor: brand?.secondaryColor ?? '#1e40af',
        fontFamily: brand?.fontFamily ?? 'Cairo',
        whiteLabelEnabled: brand?.whiteLabelEnabled ?? false,
      },
      landing: {
        status: 'PUBLISHED' as const,
        seoTitle: landing.seoTitle,
        seoDescription: landing.seoDescription,
        ogImageUrl: landing.ogImageUrl,
        content: landing.content as unknown as LandingContentDto,
        updatedAt: landing.updatedAt.toISOString(),
        publishedAt: landing.publishedAt?.toISOString() ?? '',
      },
      courses,
    };
  }

  async findPublicByDomain(domain: string): Promise<LandingPublicResponseDto> {
    const brand = await this.prisma.brand.findFirst({
      where: { customDomain: domain },
      include: {
        instance: {
          include: {
            landingPage: true,
            groups: {
              include: {
                courses: {
                  include: {
                    _count: { select: { enrollments: true } },
                  },
                },
                _count: { select: { students: true } },
              },
            },
          },
        },
      },
    });

    if (!brand || !brand.instance) {
      throw new NotFoundException('Instance not found for this domain');
    }

    const instance = brand.instance;

    if (
      !instance.landingPage ||
      instance.landingPage.status !== LandingPageStatus.PUBLISHED
    ) {
      throw new NotFoundException('Landing page not found or not published');
    }

    const landing = instance.landingPage;

    const courses = instance.groups.flatMap((g) =>
      g.courses.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        groupId: g.id,
        groupName: g.name,
        registrationMode: g.registrationMode,
        studentCount: c._count.enrollments,
      })),
    );

    return {
      instance: {
        id: instance.id,
        name: instance.name,
        subdomain: instance.subdomain,
        customDomain: brand.customDomain ?? null,
      },
      brand: {
        logoUrl: brand.logoUrl ?? null,
        primaryColor: brand.primaryColor ?? '#2563eb',
        secondaryColor: brand.secondaryColor ?? '#1e40af',
        fontFamily: brand.fontFamily ?? 'Cairo',
        whiteLabelEnabled: brand.whiteLabelEnabled ?? false,
      },
      landing: {
        status: 'PUBLISHED' as const,
        seoTitle: landing.seoTitle,
        seoDescription: landing.seoDescription,
        ogImageUrl: landing.ogImageUrl,
        content: landing.content as unknown as LandingContentDto,
        updatedAt: landing.updatedAt.toISOString(),
        publishedAt: landing.publishedAt?.toISOString() ?? '',
      },
      courses,
    };
  }

  private async validateCourseIds(
    instanceId: string,
    courseIds: string[],
  ): Promise<void> {
    if (!courseIds.length) return;

    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, instanceId },
      select: { id: true },
    });

    const foundIds = new Set(courses.map((c) => c.id));
    const invalidIds = courseIds.filter((id) => !foundIds.has(id));
    if (invalidIds.length) {
      throw new ForbiddenException(
        `Courses not found in current instance: ${invalidIds.join(', ')}`,
      );
    }
  }

  private toResponseDto(page: {
    id: string;
    status: LandingPageStatus;
    locale: string;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageUrl: string | null;
    content: unknown;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const validation = this.validateContent(page.content as LandingContentDto);
    return {
      id: page.id,
      status: page.status,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      ogImageUrl: page.ogImageUrl,
      content: page.content,
      validation,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
      publishedAt: page.publishedAt?.toISOString() ?? null,
    };
  }
}
