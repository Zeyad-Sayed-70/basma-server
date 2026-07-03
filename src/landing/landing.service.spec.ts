import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { LandingService } from './landing.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';
import { LandingPageStatus } from '@prisma/client';

const mockInstanceId = 'inst-001';

function runWithTenant(fn: () => Promise<unknown>) {
  return TenantContext.runWithContext(
    { instanceId: mockInstanceId, role: 'teacher' },
    fn,
  );
}

describe('LandingService', () => {
  let service: LandingService;
  let prisma: PrismaService;

  const mockPrisma = {
    instance: {
      findUnique: jest.fn(),
    },
    landingPage: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    course: {
      findMany: jest.fn(),
    },
    brand: {
      findFirst: jest.fn(),
    },
  } as unknown as jest.Mocked<PrismaService>;

  const mockMinio = {
    uploadBuffer: jest.fn(),
    getObjectUrl: jest.fn(),
  } as unknown as jest.Mocked<MinioService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<LandingService>(LandingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getOrCreateForCurrentInstance', () => {
    it('should return existing landing page', async () => {
      const existingPage = {
        id: 'lp-1',
        instanceId: mockInstanceId,
        status: LandingPageStatus.DRAFT,
        locale: 'ar',
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        content: { template: 'classic-academy', hero: { title: 'Test' } },
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.landingPage.findUnique as jest.Mock).mockResolvedValue(
        existingPage,
      );

      const result = await runWithTenant(() =>
        service.getOrCreateForCurrentInstance(),
      );

      expect(result.id).toBe('lp-1');
      expect(result.status).toBe('DRAFT');
    });

    it('should create default landing page if none exists', async () => {
      (prisma.landingPage.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.instance.findUnique as jest.Mock).mockResolvedValue({
        name: 'My Academy',
      });

      const newPage = {
        id: 'lp-2',
        instanceId: mockInstanceId,
        status: LandingPageStatus.DRAFT,
        locale: 'ar',
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        content: { template: 'classic-academy', hero: { title: 'My Academy' } },
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.landingPage.create as jest.Mock).mockResolvedValue(newPage);

      const result = await runWithTenant(() =>
        service.getOrCreateForCurrentInstance(),
      );

      expect(result.id).toBe('lp-2');
      expect(result.content.hero.title).toBe('My Academy');
    });

    it('should fail without tenant context', async () => {
      await expect(service.getOrCreateForCurrentInstance()).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('publishForCurrentInstance', () => {
    it('should publish when content is valid', async () => {
      const draftPage = {
        id: 'lp-1',
        instanceId: mockInstanceId,
        status: LandingPageStatus.DRAFT,
        locale: 'ar',
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        content: {
          template: 'classic-academy',
          hero: {
            title: 'My Academy',
            primaryCta: { label: 'سجل الآن', type: 'REGISTER' },
          },
          featuredCourses: { mode: 'NONE', courseIds: [] },
        },
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.landingPage.findUnique as jest.Mock).mockResolvedValue(draftPage);

      const publishedPage = {
        ...draftPage,
        status: LandingPageStatus.PUBLISHED,
        publishedAt: new Date(),
      };
      (prisma.landingPage.update as jest.Mock).mockResolvedValue(publishedPage);

      const result = await runWithTenant(() =>
        service.publishForCurrentInstance(),
      );

      expect(result.status).toBe('PUBLISHED');
    });

    it('should fail publish when hero title is missing', async () => {
      const invalidPage = {
        id: 'lp-1',
        instanceId: mockInstanceId,
        status: LandingPageStatus.DRAFT,
        locale: 'ar',
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        content: {
          template: 'classic-academy',
          hero: {
            title: '',
            primaryCta: { label: '', type: 'REGISTER' },
          },
          featuredCourses: { mode: 'NONE', courseIds: [] },
        },
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.landingPage.findUnique as jest.Mock).mockResolvedValue(
        invalidPage,
      );

      await expect(
        runWithTenant(() => service.publishForCurrentInstance()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findPublicBySubdomain', () => {
    it('should return published landing page with brand and courses', async () => {
      const mockInstance = {
        id: 'inst-001',
        name: 'My Academy',
        subdomain: 'myacademy',
        brand: {
          logoUrl: null,
          primaryColor: '#2563eb',
          secondaryColor: '#1e40af',
          fontFamily: 'Cairo',
          whiteLabelEnabled: false,
          customDomain: null,
        },
        landingPage: {
          id: 'lp-1',
          status: 'PUBLISHED',
          seoTitle: 'My Academy',
          seoDescription: null,
          ogImageUrl: null,
          content: {
            template: 'classic-academy',
            hero: { title: 'My Academy' },
          },
          updatedAt: new Date(),
          publishedAt: new Date(),
        },
        groups: [
          {
            id: 'g-1',
            name: 'Class A',
            registrationMode: 'OPEN',
            courses: [
              {
                id: 'c-1',
                title: 'Math 101',
                description: 'Basic math',
                price: 0,
                _count: { enrollments: 5 },
              },
            ],
            _count: { students: 10 },
          },
        ],
      };
      (prisma.instance.findUnique as jest.Mock).mockResolvedValue(mockInstance);

      const result = await service.findPublicBySubdomain('myacademy');

      expect(result.instance.name).toBe('My Academy');
      expect(result.landing.status).toBe('PUBLISHED');
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].title).toBe('Math 101');
    });

    it('should throw NotFoundException for unpublished landing', async () => {
      const mockInstance = {
        id: 'inst-001',
        name: 'My Academy',
        subdomain: 'myacademy',
        brand: null,
        landingPage: {
          id: 'lp-1',
          status: 'DRAFT',
          content: {},
          updatedAt: new Date(),
          publishedAt: null,
        },
        groups: [],
      };
      (prisma.instance.findUnique as jest.Mock).mockResolvedValue(mockInstance);

      await expect(service.findPublicBySubdomain('myacademy')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-existent instance', async () => {
      (prisma.instance.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findPublicBySubdomain('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
