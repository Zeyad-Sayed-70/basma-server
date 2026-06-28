import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredPayments() {
    const count = await this.paymentsService.cancelExpiredPayments();
    if (count > 0) {
      this.logger.log(`Cron: cancelled ${count} expired payment(s)`);
    }
  }
}
