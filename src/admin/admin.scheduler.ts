import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminScheduler {
  private readonly logger = new Logger(AdminScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 6 * * *')
  async checkExpiredPlans() {
    this.logger.log('Checking for expired plans...');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const expired = await this.prisma.instance.findMany({
      where: {
        tier: { not: 'MUBTADI' },
        tierExpiresAt: { not: null, lte: sevenDaysAgo },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        tier: true,
        tierExpiresAt: true,
      },
    });

    if (expired.length > 0) {
      this.logger.warn(
        `Found ${expired.length} instance(s) with expired plans:\n${expired.map((i) => `  - ${i.name} (${i.subdomain}) [${i.tier}] expired ${i.tierExpiresAt?.toISOString()}`).join('\n')}`,
      );
    } else {
      this.logger.log('No expired plans found.');
    }
  }
}
