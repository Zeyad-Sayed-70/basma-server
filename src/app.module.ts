import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { StudentsModule } from './students/students.module';
import { CoursesModule } from './courses/courses.module';
import { SessionsModule } from './sessions/sessions.module';
import { BrandModule } from './brand/brand.module';
import { MinioModule } from './minio/minio.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { GradebookModule } from './gradebook/gradebook.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { AgentSpaceModule } from './agent-space/agent-space.module';
import { AgentStudentDataModule } from './agent-student-data/agent-student-data.module';
import { AiAgentModule } from './ai-agent/ai-agent.module';
import { TenantMiddleware } from './common/context/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    GroupsModule,
    StudentsModule,
    CoursesModule,
    SessionsModule,
    BrandModule,
    MinioModule,
    QuizzesModule,
    AssignmentsModule,
    GradebookModule,
    NotificationsModule,
    PaymentsModule,
    ChatModule,
    AgentSpaceModule,
    AgentStudentDataModule,
    AiAgentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('payments/webhook/paymob/:instanceId')
      .forRoutes('*');
  }
}
