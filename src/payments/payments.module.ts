import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsPublicController } from './payments-public.controller';
import { PaymentsService } from './payments.service';
import { PaymentsScheduler } from './payments.scheduler';
import { PaymobService } from './paymob.service';
import { TeacherPaymentMethodsService } from './teacher-payment-methods.service';

@Module({
  controllers: [PaymentsController, PaymentsPublicController],
  providers: [
    PaymentsService,
    PaymobService,
    PaymentsScheduler,
    TeacherPaymentMethodsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
