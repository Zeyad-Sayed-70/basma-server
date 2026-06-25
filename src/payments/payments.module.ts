import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsPublicController } from './payments-public.controller';
import { PaymentsService } from './payments.service';
import { PaymobService } from './paymob.service';

@Module({
  controllers: [PaymentsController, PaymentsPublicController],
  providers: [PaymentsService, PaymobService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
