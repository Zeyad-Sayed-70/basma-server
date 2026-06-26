import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentSpaceController } from './agent-space.controller';
import { AgentSpaceService } from './agent-space.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgentSpaceController],
  providers: [AgentSpaceService],
  exports: [AgentSpaceService],
})
export class AgentSpaceModule {}
