import { PrismaClient, Tier } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const skipDemo = process.env.SKIP_DEMO_SEED === 'true' || process.env.NODE_ENV === 'production';

  if (!skipDemo) {
    const instance = await prisma.instance.upsert({
      where: { subdomain: 'demo' },
      update: {},
      create: {
        name: 'Demo School',
        subdomain: 'demo',
        tier: Tier.MUBTADI,
        brand: {
          create: {
            primaryColor: '#2563eb',
            secondaryColor: '#1e40af',
            fontFamily: 'Cairo',
          },
        },
        teacher: {
          create: {
            email: 'teacher@basma.demo',
            passwordHash: await bcrypt.hash('Demo@123', 10),
            name: 'أحمد محمد',
            lang: 'ar',
          },
        },
      },
      include: { teacher: true },
    });

    const notificationTypes = ['SESSION_REMINDER', 'QUIZ_GRADED', 'ASSIGNMENT_DUE', 'CUSTOM'] as const;
    for (const type of notificationTypes) {
      await prisma.notificationPreference.upsert({
        where: { instanceId_type: { instanceId: instance.id, type } },
        update: {},
        create: { type, enabled: true, instanceId: instance.id },
      });
    }

    console.log('Seed — demo instance created:', instance.subdomain);
  } else {
    console.log('Seed — skipping demo instance (production mode)');
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@basma.app';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';
  const adminName = process.env.ADMIN_NAME ?? 'Admin';

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { name: adminName },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: adminName,
    },
  });

  console.log('Seed — admin created:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect);
