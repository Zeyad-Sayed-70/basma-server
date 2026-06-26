import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { WsTestController } from './ws-test.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [
    PrismaModule,
    MinioModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ??
            '7d') as unknown as never,
        },
      }),
    }),
  ],
  controllers: [ChatController, WsTestController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
