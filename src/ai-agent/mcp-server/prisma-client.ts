import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function getInstanceId(): string {
  const id = process.env.BASMA_INSTANCE_ID;
  if (!id) {
    throw new Error('BASMA_INSTANCE_ID environment variable is required');
  }
  return id;
}
