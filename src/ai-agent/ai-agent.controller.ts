import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AiAgentService } from './ai-agent.service';
import { SendMessageDto, CreateConversationDto } from './dto/chat.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('AI Agent')
@Controller('ai-agent')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Get('conversations')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('student')
  @ApiOperation({ summary: 'List student conversations with AI agent' })
  async listConversations(
    @CurrentUser() user: { id: string; instanceId: string },
  ) {
    return this.aiAgentService.getConversations(user.id, user.instanceId);
  }

  @Post('conversations')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('student')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation with AI agent' })
  async createConversation(
    @CurrentUser() user: { id: string; instanceId: string },
    @Body() dto: CreateConversationDto,
  ) {
    return this.aiAgentService.createConversation(
      user.id,
      user.instanceId,
      dto.title,
    );
  }

  @Get('conversations/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('student', 'teacher')
  @ApiOperation({ summary: 'Get conversation details' })
  async getConversation(
    @CurrentUser('instanceId') instanceId: string,
    @Param('id') id: string,
  ) {
    return this.aiAgentService.getConversation(id, instanceId);
  }

  @Get('conversations/:id/messages')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('student', 'teacher')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @CurrentUser('instanceId') instanceId: string,
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.aiAgentService.getMessages(id, instanceId, limit);
  }

  @Patch('conversations/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('student')
  @ApiOperation({ summary: 'Update conversation title' })
  async updateConversation(
    @CurrentUser('instanceId') instanceId: string,
    @Param('id') id: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.aiAgentService.updateConversationTitle(
      id,
      instanceId,
      dto.title ?? 'Untitled',
    );
  }

  @Delete('conversations/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('student')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a conversation' })
  async archiveConversation(
    @CurrentUser('instanceId') instanceId: string,
    @Param('id') id: string,
  ) {
    await this.aiAgentService.archiveConversation(id, instanceId);
  }

  @Post('conversations/:id/messages')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send message to AI agent (SSE streamed response)' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: { id: string; instanceId: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const result = await this.aiAgentService.sendMessage(
        conversationId,
        user.instanceId,
        user.id,
        dto.content,
      );

      res.write(
        `data: ${JSON.stringify({ type: 'student_message', ...result.message })}\n\n`,
      );

      res.write(
        `data: ${JSON.stringify({ type: 'agent_reply', content: result.agentReply, toolCalls: result.toolCalls, fallbackUsed: result.fallbackUsed })}\n\n`,
      );

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`,
      );
      res.end();
    }
  }

  @Get('agent.md')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('teacher')
  @ApiOperation({ summary: 'Get teacher agent.md configuration' })
  getAgentMd(@CurrentUser('instanceId') instanceId: string) {
    const content = this.aiAgentService.getAgentMd(instanceId);
    if (!content) {
      return {
        content: null,
        message:
          'No agent.md configured yet. Send a chat first to auto-generate.',
      };
    }
    return { content };
  }

  @Put('agent.md')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update teacher agent.md configuration' })
  updateAgentMd(
    @CurrentUser('instanceId') instanceId: string,
    @Body() body: { content: string },
  ) {
    this.aiAgentService.updateAgentMd(instanceId, body.content);
    return { success: true };
  }

  @Get('teacher/conversations')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles('teacher')
  @ApiOperation({ summary: 'Teacher views all student conversations' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  async teacherListConversations(
    @CurrentUser('instanceId') instanceId: string,
    @Query('studentId') studentId?: string,
  ) {
    if (!studentId) {
      return [];
    }
    return this.aiAgentService.getConversations(studentId, instanceId);
  }
}
