import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatService } from './chat.service';
import { TenantContext } from '../common/context/tenant-context';
import { TypingDto } from './dto/typing.dto';

interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      instanceId: string;
      role: string;
    };
  };
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinGroup')
  @UseGuards(WsJwtGuard)
  async handleJoinGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string },
  ) {
    const { instanceId, id, role } = client.data.user;

    return TenantContext.runWithContext({ instanceId }, async () => {
      const valid = await this.chatService.validateGroupMembership(
        id,
        role,
        data.groupId,
      );
      if (!valid) {
        return {
          event: 'error',
          data: { message: 'Not a member of this group' },
        };
      }

      await client.join(`group:${data.groupId}`);
      this.logger.log(`${role} ${id} joined group:${data.groupId}`);
      return { event: 'joined', data: { groupId: data.groupId } };
    });
  }

  @SubscribeMessage('leaveGroup')
  @UseGuards(WsJwtGuard)
  async handleLeaveGroup(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string },
  ) {
    await client.leave(`group:${data.groupId}`);
    return { event: 'left', data: { groupId: data.groupId } };
  }

  @SubscribeMessage('sendMessage')
  @UseGuards(WsJwtGuard)
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { groupId: string; content: string },
  ) {
    const { instanceId, id, role } = client.data.user;

    return TenantContext.runWithContext({ instanceId }, async () => {
      const valid = await this.chatService.validateGroupMembership(
        id,
        role,
        data.groupId,
      );
      if (!valid) {
        return {
          event: 'error',
          data: { message: 'Not a member of this group' },
        };
      }

      const message = await this.chatService.sendMessage(
        id,
        role,
        data.groupId,
        data.content,
      );

      this.server.to(`group:${data.groupId}`).emit('newMessage', message);

      return { event: 'messageSent', data: message };
    });
  }

  @SubscribeMessage('typing')
  @UseGuards(WsJwtGuard)
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TypingDto,
  ) {
    const { instanceId, id, role } = client.data.user;

    return TenantContext.runWithContext({ instanceId }, async () => {
      const senderName = await this.chatService.getSenderName(id, role);

      client.to(`group:${data.groupId}`).emit('typingIndicator', {
        senderId: id,
        senderName,
        senderRole: role,
        groupId: data.groupId,
        isTyping: data.isTyping,
      });

      return {
        event: 'typingAck',
        data: { groupId: data.groupId, isTyping: data.isTyping },
      };
    });
  }
}
