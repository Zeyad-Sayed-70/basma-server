import { prisma, getInstanceId } from '../prisma-client';
import type { ToolDefinition } from '../types';

export const spaceListTool: ToolDefinition = {
  name: 'basma_space_list',
  description: "List all files in the teacher's knowledge space",
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Max results (default 50)' },
      offset: { type: 'number', description: 'Pagination offset (default 0)' },
    },
  },
  handler: async (args: { limit?: number; offset?: number }) => {
    const instanceId = getInstanceId();
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const files = await prisma.agentSpaceFile.findMany({
      where: { instanceId },
      select: {
        id: true,
        filename: true,
        fileType: true,
        fileSize: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
    };
  },
};
