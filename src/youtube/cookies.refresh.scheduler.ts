import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CookiesRefreshService } from './cookies.refresh.service';

@Injectable()
export class CookiesRefreshScheduler implements OnModuleInit {
  private readonly logger = new Logger(CookiesRefreshScheduler.name);

  constructor(private readonly cookiesRefresh: CookiesRefreshService) {}

  async onModuleInit() {
    this.logger.log('scheduler.cookies_initial_refresh');
    await this.handle();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle() {
    this.logger.log('scheduler.cookies_refresh starting');
    const result = await this.cookiesRefresh.refresh();

    if (!result.ok) {
      this.logger.warn(
        `scheduler.cookies_refresh failed — cookies not updated`,
      );
    } else {
      this.logger.log(`scheduler.cookies_refresh done count=${result.count}`);
    }
  }
}
