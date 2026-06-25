import { PrismaClient, Tier } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const instance = await prisma.instance.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo School',
      subdomain: 'demo',
      tier: Tier.FREE,
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

  console.log('Seed complete — demo instance created:', instance.subdomain);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect);
