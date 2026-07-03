import { Module } from '@nestjs/common';
import { LandingController } from './landing.controller';
import { LandingPublicController } from './landing-public.controller';
import { LandingService } from './landing.service';

@Module({
  controllers: [LandingController, LandingPublicController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
