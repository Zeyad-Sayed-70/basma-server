import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpencodeService } from './opencode.service';

interface TextPart {
  type: 'text';
  text: string;
}

interface ToolPart {
  type: 'tool';
  tool: string;
  state: string;
  callID: string;
}

type Part = TextPart | ToolPart;

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly opencodeService: OpencodeService,
  ) {}

  async getConversations(studentId: string, instanceId: string) {
    return this.prisma.agentConversation.findMany({
      where: { studentId, instanceId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getConversation(id: string, instanceId: string) {
    const conv = await this.prisma.agentConversation.findFirst({
      where: { id, instanceId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async createConversation(
    studentId: string,
    instanceId: string,
    title?: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student || student.instanceId !== instanceId) {
      throw new ForbiddenException('Student not found in this instance');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { instanceId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    this.opencodeService.ensureTeacherProject(
      instanceId,
      teacher.name,
      `---
description: AI teaching assistant
mode: primary
---

You are an AI teaching assistant for the teacher **${teacher.name}**.

## Your Role
- Answer student questions based on the teacher's knowledge base
- Use \`basma_space_list\`, \`basma_space_read\`, and \`basma_space_search\` tools to find relevant information
- At the start of each interaction, use \`basma_student_profile\` with \`action: "get"\` to recall past information about the student
- When a student shares personal information (name, age, learning style, preferences, strengths, weaknesses), use \`basma_student_profile\` with \`action: "update"\` to save it
- Use \`basma_note_record\` to record useful observations during conversations
- Never invent information
- NEVER use any built-in tools (bash, edit, write, read, glob, grep, webfetch, etc.)
- ONLY use basma-mcp tools

## Rules
- You can only access files in the teacher's space
- Record any new information you learn about students in their profile
- Detect the language the student is using and respond in the same language — use Egyptian Arabic dialect (العامية المصرية) if they write in Arabic, or English if they write in English
- Never mention any tools, MCP, profiles, or technical implementation in your responses to the student
- Keep all tool usage invisible — respond naturally as if you just know or remember the information
- Be helpful, accurate, and cite which document your answer comes from
- If a student asks something not in the space, honestly say you don't have that information
`,
    );

    const client = this.opencodeService.getClient();
    let opencodeSessionId: string | undefined;
    if (client) {
      try {
        const sessionResult = await client.session.create({
          body: { title: title ?? `Chat with ${student.name}` },
          query: {
            directory: this.opencodeService.getTeacherProjectDir(instanceId),
          },
        });
        if (sessionResult.data) {
          opencodeSessionId = sessionResult.data.id;
        } else {
          this.logger.warn(
            `Failed to create OpenCode session (HTTP ${sessionResult.response.status}): ${JSON.stringify(sessionResult.error)}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Failed to create OpenCode session: ${(err as Error).message}`,
        );
      }
    }

    const conv = await this.prisma.agentConversation.create({
      data: {
        studentId,
        instanceId,
        title: title ?? `Chat with ${student.name}`,
        opencodeSessionId,
      },
    });
    return conv;
  }

  async getMessages(conversationId: string, instanceId: string, limit = 50) {
    await this.getConversation(conversationId, instanceId);
    return this.prisma.agentMessage.findMany({
      where: { conversationId, instanceId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async archiveConversation(id: string, instanceId: string) {
    await this.getConversation(id, instanceId);
    return this.prisma.agentConversation.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async updateConversationTitle(id: string, instanceId: string, title: string) {
    await this.getConversation(id, instanceId);
    return this.prisma.agentConversation.update({
      where: { id },
      data: { title },
    });
  }

  async sendMessage(
    conversationId: string,
    instanceId: string,
    studentId: string,
    content: string,
  ) {
    const conv = await this.getConversation(conversationId, instanceId);
    if (conv.studentId !== studentId) {
      throw new ForbiddenException('This conversation does not belong to you');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const teacher = await this.prisma.teacher.findUnique({
      where: { instanceId },
    });
    if (!teacher)
      throw new NotFoundException('Teacher not found for this instance');

    const savedMessage = await this.prisma.agentMessage.create({
      data: {
        conversationId,
        instanceId,
        role: 'student',
        content,
      },
    });

    const client = this.opencodeService.getClient();
    if (!client) {
      return {
        message: savedMessage,
        agentReply: 'AI agent is not available. Please try again later.',
      };
    }

    let opencodeSessionId = conv.opencodeSessionId;
    if (!opencodeSessionId) {
      try {
        const sessionResult = await client.session.create({
          body: { title: conv.title ?? 'Chat session' },
          query: {
            directory: this.opencodeService.getTeacherProjectDir(instanceId),
          },
        });
        if (sessionResult.data) {
          opencodeSessionId = sessionResult.data.id;
          await this.prisma.agentConversation.update({
            where: { id: conversationId },
            data: { opencodeSessionId },
          });
        } else {
          this.logger.error(
            `Failed to create OpenCode session (HTTP ${sessionResult.response.status}): ${JSON.stringify(sessionResult.error)}`,
          );
          return {
            message: savedMessage,
            agentReply: 'Failed to create AI session. Please try again later.',
          };
        }
      } catch (err) {
        this.logger.error(
          `Failed to create OpenCode session: ${(err as Error).message}`,
        );
        return {
          message: savedMessage,
          agentReply: 'Failed to connect to AI agent. Please try again later.',
        };
      }
    }

    const promptParts: Array<{ type: 'text'; text: string }> = [];
    promptParts.push({
      type: 'text',
      text: `[Student: ${student.name} | ID: ${student.id}]\n\n${content}`,
    });

    const modelId = this.opencodeService.getZenModel();

    const executePrompt = async (model: string, provider: string) => {
      const result = await client.session.prompt({
        path: { id: opencodeSessionId },
        body: {
          model: { providerID: provider, modelID: model },
          parts: promptParts,
        },
      });
      const responseParts = (result.data?.parts ?? []) as Part[];
      const text = responseParts
        .filter((p): p is TextPart => p.type === 'text')
        .map((p) => p.text)
        .join('\n');
      const calls = responseParts
        .filter((p): p is ToolPart => p.type === 'tool')
        .map((p) => ({
          tool: p.tool,
          state: p.state,
          callID: p.callID,
        }));
      return { text, calls };
    };

    try {
      const { text: assistantText, calls: toolCalls } = await executePrompt(
        modelId,
        'opencode',
      );

      await this.prisma.agentMessage.create({
        data: {
          conversationId,
          instanceId,
          role: 'agent',
          content: assistantText,
          toolCalls:
            toolCalls.length > 0
              ? (toolCalls as Prisma.InputJsonValue)
              : undefined,
          model: modelId,
        },
      });

      return {
        message: savedMessage,
        agentReply: assistantText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 429 && this.opencodeService.getNimApiKey()) {
        const nimModelId = this.opencodeService.getNimModel();
        try {
          const { text: assistantText, calls: toolCalls } = await executePrompt(
            nimModelId,
            'nim',
          );

          await this.prisma.agentMessage.create({
            data: {
              conversationId,
              instanceId,
              role: 'agent',
              content: assistantText,
              toolCalls:
                toolCalls.length > 0
                  ? (toolCalls as Prisma.InputJsonValue)
                  : undefined,
              model: nimModelId,
            },
          });

          return {
            message: savedMessage,
            agentReply: assistantText,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            fallbackUsed: true,
          };
        } catch (fallbackErr) {
          this.logger.error(
            `Fallback also failed: ${(fallbackErr as Error).message}`,
          );
        }
      }

      this.logger.error(
        `OpenCode prompt failed: ${(apiError as Error).message}`,
      );
      return {
        message: savedMessage,
        agentReply:
          'I apologize, but I encountered an error processing your request. Please try again later.',
      };
    }
  }

  updateAgentMd(instanceId: string, content: string) {
    this.opencodeService.writeAgentMd(instanceId, content);
  }

  getAgentMd(instanceId: string) {
    return this.opencodeService.readAgentMd(instanceId);
  }
}
