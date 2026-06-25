import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { WhatsAppSendQueue } from './whatsapp/whatsapp-send-queue';
import { SessionCreatedListener } from './listeners/session-created.listener';
import { QuizGradedListener } from './listeners/quiz-graded.listener';
import { AssignmentGradedListener } from './listeners/assignment-graded.listener';
import { NotificationsScheduler } from './notifications.scheduler';
import { RedisModule } from './redis.module';

@Module({
  imports: [RedisModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WhatsAppService,
    WhatsAppSendQueue,
    SessionCreatedListener,
    QuizGradedListener,
    AssignmentGradedListener,
    NotificationsScheduler,
  ],
  exports: [NotificationsService, WhatsAppService],
})
export class NotificationsModule {}
