import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { Request, Response, NextFunction } from 'express';
import { JoinGroupDto } from './chat/dto/join-group.dto';
import { SendMessageDto } from './chat/dto/send-message.dto';
import { TypingDto } from './chat/dto/typing.dto';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const cookies = (req as unknown as { cookies?: Record<string, string> })
      .cookies;
    const token = cookies?.['admin_token'];
    if (token && req.path.startsWith('/admin')) {
      req.headers['authorization'] = `Bearer ${token}`;
    }
    next();
  });

  app.setViewEngine('ejs');
  app.setBaseViewsDir(resolve(process.cwd(), 'src', 'admin', 'views'));

  const corsOrigins = process.env.CORS_ORIGINS?.split(',') ?? [
    'http://localhost:3001',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useStaticAssets(resolve(process.cwd(), 'src', 'admin', 'public'), { prefix: '/admin/static/' });

  app.setGlobalPrefix('api', { exclude: ['admin', 'admin/*path', 'api/admin', 'api/admin/*path'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const wsDescription = [
    '### WebSocket Chat (`/chat` namespace)',
    '',
    '**Protocol**: socket.io | **Auth**: JWT via `socket.handshake.auth.token`',
    '',
    '**Client → Server** (ack responses):',
    '| Event | Payload | Ack |',
    '|---|---|---|',
    '| `joinGroup` | `JoinGroupDto` | `{ event: "joined", data: { groupId } }` |',
    '| `leaveGroup` | `JoinGroupDto` | `{ event: "left", data: { groupId } }` |',
    '| `sendMessage` | `SendMessageDto` | `{ event: "messageSent", data: Message }` |',
    '| `typing` | `TypingDto` | `{ event: "typingAck", data: { groupId, isTyping } }` |',
    '',
    '**Server → Client** (broadcast to `group:{groupId}`):',
    '| Event | Payload | Description |',
    '|---|---|---|',
    '| `newMessage` | `MessageResponseDto` | New message in group |',
    '| `typingIndicator` | `{ senderId, senderName, senderRole, groupId, isTyping }` | Typing status (excludes sender) |',
    '| `error` | `{ message: string }` | Error notification |',
    '',
    '**Test page**: [`/api/ws-test`](/api/ws-test)',
  ].join('\n');

  const port = process.env.PORT ?? 3000;
  const serverUrl = process.env.API_SERVER_URL ?? `http://localhost:${port}`;

  const config = new DocumentBuilder()
    .setTitle('Basma API')
    .setDescription(
      'Educational platform backend — multi-tenant, white-labeled\n\n---\n\n' +
        wsDescription,
    )
    .setVersion('1.0')
    .addServer(serverUrl)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [JoinGroupDto, SendMessageDto, TypingDto],
  });

  SwaggerModule.setup('api/docs', app, document);

  const specPath = resolve(process.cwd(), 'openapi-spec.json');
  writeFileSync(specPath, JSON.stringify(document, null, 2));
  logger.log(`OpenAPI spec written to ${specPath}`);

  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
