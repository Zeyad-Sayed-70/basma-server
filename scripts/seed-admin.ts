import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
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

  console.log('Admin created/updated:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect);
