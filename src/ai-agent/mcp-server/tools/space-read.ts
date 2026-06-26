import { prisma, getInstanceId } from '../prisma-client';
import type { ToolDefinition } from '../types';

export const spaceReadTool: ToolDefinition = {
  name: 'basma_space_read',
  description:
    "Read a file from the teacher's knowledge space with optional line range. Use start and limit to read specific sections (e.g., start=100, limit=200 reads lines 100-300)",
  inputSchema: {
    type: 'object',
    properties: {
      fileId: { type: 'string', description: 'File ID to read' },
      start: {
        type: 'number',
        description: 'Starting line number (1-indexed, default 1)',
      },
      limit: {
        type: 'number',
        description: 'Number of lines to read (default all)',
      },
    },
    required: ['fileId'],
  },
  handler: async (args: { fileId: string; start?: number; limit?: number }) => {
    const instanceId = getInstanceId();

    const file = await prisma.agentSpaceFile.findFirst({
      where: { id: args.fileId, instanceId },
    });

    if (!file) {
      return {
        content: [
          { type: 'text', text: 'Error: File not found or access denied.' },
        ],
        isError: true,
      };
    }

    const lines = file.content.split('\n');
    const totalLines = lines.length;
    const start = args.start ?? 1;
    const end = args.limit ? start + args.limit - 1 : totalLines;

    const clampedStart = Math.max(1, start);
    const clampedEnd = Math.min(totalLines, end);

    if (clampedStart > totalLines) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: File has only ${totalLines} lines. Start line ${start} is beyond file length.`,
          },
        ],
        isError: true,
      };
    }

    const selectedLines = lines.slice(clampedStart - 1, clampedEnd);
    const content = selectedLines.join('\n');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              filename: file.filename,
              content,
              totalLines,
              startLine: clampedStart,
              endLine: clampedEnd,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
