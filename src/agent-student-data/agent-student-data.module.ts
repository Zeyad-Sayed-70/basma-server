import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AgentStudentDataController } from './agent-student-data.controller';
import { AgentStudentDataService } from './agent-student-data.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgentStudentDataController],
  providers: [AgentStudentDataService],
  exports: [AgentStudentDataService],
})
export class AgentStudentDataModule {}
