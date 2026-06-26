import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  MaxFileSizeValidator,
  ParseFilePipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import {
  MessageResponseDto,
  MessageListResponseDto,
  UnreadCountListDto,
} from './dto/message-response.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Get('groups/:groupId/messages')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get message history for a group',
    description:
      'Returns paginated chat messages. Use cursor for infinite scroll.',
  })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination (message ID)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Messages per page (default 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved',
    type: MessageListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMessages(
    @Param('groupId') groupId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      groupId,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('groups/:groupId/files')
  @Roles('teacher', 'student')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload a file to chat',
    description:
      'Uploads a file and creates a chat message with file URL. Max 10MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @Param('groupId') groupId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.uploadFile(user.id, user.role, groupId, file);
  }

  @Delete('messages/:id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a message (teacher only)',
    description:
      'Teacher can delete any message in their instance. This is for moderation.',
  })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMessage(@Param('id') id: string) {
    await this.chatService.deleteMessage(id);
  }

  @Get('unread')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get unread message counts',
    description: 'Returns unread message count per group for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread counts',
    type: UnreadCountListDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCounts(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getUnreadCounts(user.id, user.role);
  }

  @Patch('groups/:groupId/read')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark group chat as read',
    description: 'Updates the last-read timestamp for the user in this group.',
  })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markRead(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.chatService.markRead(user.id, groupId);
    return { success: true };
  }
}
