import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { JoinGroupDto } from '../src/chat/dto/join-group.dto';
import { SendMessageDto } from '../src/chat/dto/send-message.dto';
import { TypingDto } from '../src/chat/dto/typing.dto';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

async function generate() {
  const app = await NestFactory.create(AppModule);

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
  ].join('\n');

  const serverUrl = process.env.API_SERVER_URL ?? 'http://localhost:3000';

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

  const specPath = resolve(process.cwd(), 'openapi-spec.json');
  writeFileSync(specPath, JSON.stringify(document, null, 2));

  console.log(`OpenAPI spec generated at ${specPath}`);
  await app.close();
}

generate();
