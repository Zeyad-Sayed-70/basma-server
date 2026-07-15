import { Module } from '@nestjs/common';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AiAgentModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
