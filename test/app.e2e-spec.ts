import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './../src/prisma/prisma.module';
import { CommonModule } from './../src/common/common.module';
import { HealthModule } from './../src/health/health.module';
import { AuthModule } from './../src/auth/auth.module';
import { GroupsModule } from './../src/groups/groups.module';
import { StudentsModule } from './../src/students/students.module';
import { CoursesModule } from './../src/courses/courses.module';
import { SessionsModule } from './../src/sessions/sessions.module';
import { BrandModule } from './../src/brand/brand.module';
import { MinioModule } from './../src/minio/minio.module';
import { QuizzesModule } from './../src/quizzes/quizzes.module';
import { AssignmentsModule } from './../src/assignments/assignments.module';
import { GradebookModule } from './../src/gradebook/gradebook.module';

@Module({})
class MockNotificationsModule {}

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
    MockNotificationsModule,
  ],
})
class TestAppModule {}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200);
  });
});
