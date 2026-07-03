import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminJwtStrategy } from './admin.strategy';
import { AdminGuard } from './admin.guard';
import { AdminScheduler } from './admin.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'secret',
        signOptions: { expiresIn: '8h' },
      }),
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy, AdminGuard, AdminScheduler],
})
export class AdminModule {}
