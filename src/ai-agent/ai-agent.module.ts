import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { OpencodeService } from './opencode.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiAgentController],
  providers: [AiAgentService, OpencodeService],
  exports: [AiAgentService, OpencodeService],
})
export class AiAgentModule {}
