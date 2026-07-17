import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpencodeService } from '../ai-agent/opencode.service';
import { TenantContext } from '../common/context/tenant-context';
import { SaveAnswersDto } from './dto/save-answers.dto';
import { OnboardingStatusDto } from './dto/onboarding-status.dto';
import { Prisma, LandingPageStatus } from '@prisma/client';

interface AiLandingResponse {
  seoTitle: string;
  seoDescription: string;
  hero: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
  };
  about?: {
    title: string;
    body: string;
  };
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  stats?: Array<{
    label: string;
    value: string;
  }>;
  testimonials?: Array<{
    name: string;
    quote: string;
    role?: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly opencodeService: OpencodeService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async getStatus(): Promise<OnboardingStatusDto> {
    const instanceId = this.getInstanceId();
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: {
        onboardingAnswers: true,
        onboardingCompleted: true,
        landingPage: { select: { id: true, content: true } },
      },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const hasContent =
      !!instance.landingPage?.content &&
      JSON.stringify(instance.landingPage.content) !== '{}';

    return {
      completed: instance.onboardingCompleted,
      answers: (instance.onboardingAnswers ?? null) as SaveAnswersDto | null,
      generated: hasContent,
    };
  }

  async saveAnswers(dto: SaveAnswersDto): Promise<OnboardingStatusDto> {
    const instanceId = this.getInstanceId();

    await this.prisma.instance.update({
      where: { id: instanceId },
      data: {
        onboardingAnswers: dto as unknown as Prisma.JsonObject,
      },
    });

    return this.getStatus();
  }

  async generate() {
    const instanceId = this.getInstanceId();

    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      include: { teacher: true, brand: true },
    });
    if (!instance || !instance.teacher) {
      throw new NotFoundException('Instance or teacher not found');
    }

    const answers = instance.onboardingAnswers as SaveAnswersDto | null;
    if (!answers) {
      throw new BadRequestException(
        'No onboarding answers found. Please save answers first.',
      );
    }

    if (
      !answers.subjects?.length ||
      !answers.audience ||
      !answers.uniqueSellingPoint
    ) {
      throw new BadRequestException(
        'Missing required fields: subjects, audience, uniqueSellingPoint',
      );
    }

    const client = this.opencodeService.getClient();
    if (!client) {
      throw new BadRequestException(
        'AI agent is not available. Please try again later.',
      );
    }

    const aiContent = await this.promptAi(
      client,
      instance.teacher.name,
      answers,
    );

    const landingContent: Prisma.JsonObject = {
      template: 'classic-academy',
      hero: {
        eyebrow: aiContent.hero.eyebrow ?? '',
        title: aiContent.hero.title,
        subtitle: aiContent.hero.subtitle ?? '',
        imageUrl: answers.heroImageUrl ?? null,
        primaryCta: { label: 'سجل الآن', type: 'REGISTER' },
      },
      about: aiContent.about
        ? {
            title: aiContent.about.title,
            body: aiContent.about.body,
            imageUrl: answers.aboutImageUrl ?? null,
            stats: aiContent.stats ?? [],
          }
        : null,
      featuredCourses: {
        mode: 'LATEST',
        courseIds: [],
      },
      features: aiContent.features ?? [],
      testimonials: aiContent.testimonials ?? [],
      faqs: aiContent.faqs ?? [],
      socialLinks: answers.contactMethod
        ? [
            {
              platform:
                answers.contactMethod.type === 'phone'
                  ? 'whatsapp'
                  : answers.contactMethod.type,
              url:
                answers.contactMethod.type === 'email'
                  ? `mailto:${answers.contactMethod.value}`
                  : `https://wa.me/${answers.contactMethod.value.replace(/[^0-9]/g, '')}`,
            },
          ]
        : [],
      contact: answers.location ? { address: answers.location } : null,
    };

    const brandColor = answers.primaryColor;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.landingPage.findUnique({
        where: { instanceId },
      });

      if (existing) {
        await tx.landingPage.update({
          where: { id: existing.id },
          data: {
            content: landingContent,
            seoTitle: aiContent.seoTitle,
            seoDescription: aiContent.seoDescription,
            status: LandingPageStatus.DRAFT,
          },
        });
      } else {
        await tx.landingPage.create({
          data: {
            instanceId,
            content: landingContent,
            seoTitle: aiContent.seoTitle,
            seoDescription: aiContent.seoDescription,
          },
        });
      }

      if (instance.brand) {
        await tx.brand.update({
          where: { id: instance.brand.id },
          data: { primaryColor: brandColor },
        });
      }
    });

    return {
      message: 'تم إنشاء محتوى الصفحة بنجاح',
      preview: {
        seoTitle: aiContent.seoTitle,
        seoDescription: aiContent.seoDescription,
        content: landingContent,
        brand: { primaryColor: brandColor },
      },
    };
  }

  async publish() {
    const instanceId = this.getInstanceId();

    const page = await this.prisma.landingPage.findUnique({
      where: { instanceId },
    });
    if (!page) {
      throw new BadRequestException(
        'No landing page found. Generate content first.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.landingPage.update({
        where: { id: page.id },
        data: {
          status: LandingPageStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      }),
      this.prisma.instance.update({
        where: { id: instanceId },
        data: { onboardingCompleted: true },
      }),
    ]);

    return { message: 'تم نشر الصفحة بنجاح' };
  }

  async skip() {
    const instanceId = this.getInstanceId();
    await this.prisma.instance.update({
      where: { id: instanceId },
      data: { onboardingCompleted: true },
    });
    return { message: 'تم تخطي الأونبوردينغ' };
  }

  private async promptAi(
    client: NonNullable<ReturnType<typeof this.opencodeService.getClient>>,
    teacherName: string,
    answers: SaveAnswersDto,
  ): Promise<AiLandingResponse> {
    let sessionId: string;
    try {
      const sessionResult = await client.session.create({
        body: { title: `Onboarding generation for ${teacherName}` },
      });

      if (!sessionResult.data) {
        throw new BadRequestException(
          `Failed to create AI session: ${JSON.stringify(sessionResult.error)}`,
        );
      }

      sessionId = sessionResult.data.id;
    } catch (err) {
      this.logger.error(
        `OpenCode session creation failed: ${(err as Error).message}`,
      );
      throw new BadRequestException(
        'AI server is not available. Please make sure OpenCode server is running and try again.',
      );
    }

    const systemPrompt = `أنت كاتب محتوى تسويقي متخصص في المنصات التعليمية العربية. مهمتك: بناءً على إجابات المدرس التالية، قم بإنشاء محتوى تسويقي احترافي وجذاب لصفحة التعريف (landing page) الخاصة به.

إجابات المدرس:
- اسم المدرس: ${teacherName}
- المواد التي يدرسها: ${answers.subjects.join('، ')}
- الجمهور المستهدف: ${answers.audience}
- ما يميزه: ${answers.uniqueSellingPoint}
- الموقع: ${answers.location ?? 'غير محدد'}
- وسيلة التواصل: ${answers.contactMethod ? answers.contactMethod.type + ': ' + answers.contactMethod.value : 'غير محدد'}
- اللون الأساسي: ${answers.primaryColor}

المطلوب منك إنشاء محتوى كامل باللغة العربية الفصحى الحديثة (فصحى ميسّرة) يتناسب مع الجمهور المستهدف. يجب أن يكون الرد بصيغة JSON فقط (بدون markdown أو أكواد) بالهيكل التالي:

{
  "seoTitle": "عنوان تحسين محركات البحث (max 60 حرف)",
  "seoDescription": "وصف لمحركات البحث (max 160 حرف)",
  "hero": {
    "eyebrow": "شعار صغير فوق العنوان الرئيسي (اختياري)",
    "title": "العنوان الرئيسي للصفحة (جذاب ومعبر)",
    "subtitle": "وصف قصير تحت العنوان (جملة أو جملتين)"
  },
  "about": {
    "title": "عنوان قسم عن الأكاديمية",
    "body": "فقرة كاملة تصف الأكاديمية والمدرس وأسلوب التدريس (لا تتعدى 500 حرف)"
  },
  "features": [
    {
      "title": "عنوان الميزة",
      "description": "وصف الميزة",
      "icon": "book"
    }
  ],
  "stats": [
    {
      "label": "تسمية الإحصائية",
      "value": "القيمة"
    }
  ],
  "testimonials": [
    {
      "name": "اسم الطالب أو ولي الأمر",
      "quote": "رأي أو تجربة حقيقية (جملة أو جملتين)",
      "role": "طالب / ولي أمر (اختياري)"
    }
  ],
  "faqs": [
    {
      "question": "سؤال شائع حول الخدمة أو المواد",
      "answer": "الإجابة الوافية على السؤال"
    }
  ]
}

ملاحظات مهمة:
- أيقونات الميزات تكون من: book, calendar, chat, certificate, target, video
- عدد الميزات المقترح: من 3 إلى 6 ميزات
- عدد التوصيات (testimonials): من 2 إلى 4
- عدد الأسئلة الشائعة (faqs): من 3 إلى 5 أسئلة واقعية
- الإحصائيات تكون تقديرية ومنطقية بناءً على إجابات المدرس (مثل عدد الطلاب، عدد السنوات الخبرة)
- المحتوى يجب أن يكون أصلياً ومخصصاً لهذا المدرس بالذات، ليس عاماً
- استخدم لغة مشوّقة وجذابة تناسب الجمهور المستهدف`;

    let result: Awaited<ReturnType<typeof client.session.prompt>>;
    try {
      result = await client.session.prompt({
        path: { id: sessionId },
        body: {
          model: {
            providerID: 'opencode',
            modelID: this.opencodeService.getZenModel(),
          },
          parts: [{ type: 'text', text: systemPrompt }],
        },
      });
    } catch (err) {
      this.logger.error(`OpenCode prompt failed: ${(err as Error).message}`);
      throw new BadRequestException(
        'AI request failed. Please ensure the OpenCode server is running and try again.',
      );
    }

    if (result.error) {
      this.logger.error(
        `OpenCode prompt error: ${JSON.stringify(result.error)}`,
      );
      throw new BadRequestException(
        `AI request failed: ${JSON.stringify(result.error)}`,
      );
    }

    this.logger.debug(
      `AI response parts: ${JSON.stringify(result.data?.parts)}`,
    );

    const parts = result.data?.parts ?? [];
    const text = parts
      .filter(
        (p: { type: string; text?: string }) => p.type === 'text' && p.text,
      )
      .map((p: { text?: string }) => p.text)
      .join('\n');

    if (!text) {
      const types = parts.map((p: { type: string }) => p.type).join(', ');
      throw new BadRequestException(
        `AI returned no text content. Got part types: [${types}]. Please try again.`,
      );
    }

    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as AiLandingResponse;

      this.validateAiResponse(parsed);

      return parsed;
    } catch {
      this.logger.error(`Failed to parse AI response: ${text}`);
      throw new BadRequestException(
        'AI returned invalid JSON. Please try again.',
      );
    }
  }

  private validateAiResponse(response: AiLandingResponse): void {
    if (!response.seoTitle || !response.hero?.title) {
      throw new BadRequestException(
        'AI response missing required fields (seoTitle, hero.title)',
      );
    }
  }
}
