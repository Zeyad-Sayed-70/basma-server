import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const specPath = resolve(process.cwd(), 'openapi-spec.json');
const spec = JSON.parse(readFileSync(specPath, 'utf-8'));

const onboardingPaths = {
  '/api/onboarding': {
    get: {
      operationId: 'OnboardingController_getStatus',
      parameters: [],
      responses: {
        '200': {
          description: 'Onboarding status retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OnboardingStatusDto' },
            },
          },
        },
      },
      security: [{ bearer: [] }],
      tags: ['Onboarding'],
      summary: 'Get onboarding status',
      description:
        'Returns whether onboarding is completed, saved answers, and whether landing content has been generated.',
    },
  },
  '/api/onboarding/answers': {
    put: {
      operationId: 'OnboardingController_saveAnswers',
      parameters: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SaveAnswersDto' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Answers saved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OnboardingStatusDto' },
            },
          },
        },
      },
      security: [{ bearer: [] }],
      tags: ['Onboarding'],
      summary: 'Save onboarding answers',
      description:
        'Saves the teacher onboarding form answers. Can be called multiple times (partial updates).',
    },
  },
  '/api/onboarding/generate': {
    post: {
      operationId: 'OnboardingController_generate',
      parameters: [],
      responses: {
        '201': {
          description: 'Landing page content generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'تم إنشاء محتوى الصفحة بنجاح' },
                  preview: {
                    type: 'object',
                    properties: {
                      seoTitle: { type: 'string' },
                      seoDescription: { type: 'string' },
                      content: {
                        type: 'object',
                        properties: {
                          template: { type: 'string' },
                          hero: { type: 'object' },
                          about: { type: 'object', nullable: true },
                          featuredCourses: { type: 'object' },
                          features: { type: 'array', items: { type: 'object' } },
                          testimonials: { type: 'array' },
                          faqs: { type: 'array' },
                          socialLinks: { type: 'array' },
                          contact: { type: 'object', nullable: true },
                        },
                      },
                      brand: {
                        type: 'object',
                        properties: { primaryColor: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { description: 'Missing answers or AI error' },
      },
      security: [{ bearer: [] }],
      tags: ['Onboarding'],
      summary: 'Generate landing page from answers',
      description:
        'Uses AI to generate landing page content, SEO fields, and brand settings from the saved onboarding answers. Returns a preview.',
    },
  },
  '/api/onboarding/publish': {
    post: {
      operationId: 'OnboardingController_publish',
      parameters: [],
      responses: {
        '201': {
          description: 'Page published, onboarding completed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'تم نشر الصفحة بنجاح' },
                },
              },
            },
          },
        },
      },
      security: [{ bearer: [] }],
      tags: ['Onboarding'],
      summary: 'Publish landing page and complete onboarding',
      description:
        'Publishes the generated landing page and marks onboarding as completed.',
    },
  },
  '/api/onboarding/skip': {
    post: {
      operationId: 'OnboardingController_skip',
      parameters: [],
      responses: {
        '201': {
          description: 'Onboarding skipped',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'تم تخطي الأونبوردينغ' },
                },
              },
            },
          },
        },
      },
      security: [{ bearer: [] }],
      tags: ['Onboarding'],
      summary: 'Skip onboarding',
      description:
        'Marks onboarding as completed without generating any landing page content.',
    },
  },
  '/api/tasks': {
    get: {
      operationId: 'TasksController_findAll',
      parameters: [],
      responses: {
        '200': {
          description: 'Tasks retrieved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TasksListResponseDto' },
            },
          },
        },
      },
      security: [{ bearer: [] }],
      tags: ['Tasks'],
      summary: 'Get getting-started tasks',
      description:
        'Returns a checklist of tasks for the teacher to get started. Each task is automatically marked complete based on live data.',
    },
  },
};

const onboardingSchemas = {
  SaveAnswersDto: {
    type: 'object',
    required: ['subjects', 'audience', 'uniqueSellingPoint', 'primaryColor'],
    properties: {
      subjects: {
        type: 'array',
        items: { type: 'string' },
        description: 'المواد اللي بيدرسها',
        example: ['الرياضيات', 'الفيزياء'],
      },
      audience: {
        type: 'string',
        description: 'الجمهور المستهدف',
        example: 'طلاب ثانوية عامة',
      },
      uniqueSellingPoint: {
        type: 'string',
        description: 'إيه اللي يميزك كمدرس',
        example: 'بشرح بأسلوب مبسط وربط بالحياة العملية',
      },
      location: {
        type: 'string',
        description: 'مكان الأكاديمية',
        example: 'القاهرة، مصر',
        nullable: true,
      },
      contactMethod: {
        nullable: true,
        $ref: '#/components/schemas/ContactMethodDto',
      },
      primaryColor: {
        type: 'string',
        description: 'اللون الأساسي',
        example: '#2563eb',
      },
      heroImageUrl: {
        type: 'string',
        description: 'رابط صورة الهيرو',
        nullable: true,
      },
      aboutImageUrl: {
        type: 'string',
        description: 'رابط صورة قسم "عن الأكاديمية"',
        nullable: true,
      },
    },
  },
  ContactMethodDto: {
    type: 'object',
    required: ['type', 'value'],
    properties: {
      type: {
        type: 'string',
        enum: ['phone', 'whatsapp', 'email'],
        example: 'whatsapp',
      },
      value: {
        type: 'string',
        example: '+201234567890',
      },
    },
  },
  OnboardingStatusDto: {
    type: 'object',
    properties: {
      completed: {
        type: 'boolean',
        description: 'هل اكتمل الأونبوردينغ',
      },
      answers: {
        nullable: true,
        $ref: '#/components/schemas/SaveAnswersDto',
      },
      generated: {
        type: 'boolean',
        description: 'هل تم توليد الصفحة',
      },
    },
  },
  TasksListResponseDto: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: { $ref: '#/components/schemas/TaskItemDto' },
      },
      completedCount: { type: 'integer' },
      totalCount: { type: 'integer' },
    },
  },
  TaskItemDto: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      labelAr: { type: 'string' },
      labelEn: { type: 'string' },
      icon: { type: 'string' },
      action: { type: 'string' },
      completed: { type: 'boolean' },
    },
  },
};

// Merge paths
Object.assign(spec.paths, onboardingPaths);

// Ensure tags exist
const existingTags = new Set(spec.tags.map((t: { name: string }) => t.name));
if (!existingTags.has('Onboarding')) {
  spec.tags.push({ name: 'Onboarding', description: 'Teacher onboarding' });
}
if (!existingTags.has('Tasks')) {
  spec.tags.push({ name: 'Tasks', description: 'Getting-started tasks' });
}

// Merge schemas
if (!spec.components) spec.components = {};
if (!spec.components.schemas) spec.components.schemas = {};
Object.assign(spec.components.schemas, onboardingSchemas);

writeFileSync(specPath, JSON.stringify(spec, null, 2));
console.log(`OpenAPI spec patched at ${specPath}`);
