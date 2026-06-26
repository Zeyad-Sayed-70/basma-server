import { prisma, getInstanceId } from '../prisma-client';
import type { ToolDefinition } from '../types';

export const spaceSearchTool: ToolDefinition = {
  name: 'basma_space_search',
  description:
    "Search content across all files in the teacher's knowledge space. Returns matching lines with context.",
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      limit: {
        type: 'number',
        description: 'Max files to search (default 20)',
      },
    },
    required: ['query'],
  },
  handler: async (args: { query: string; limit?: number }) => {
    const instanceId = getInstanceId();
    const limit = args.limit ?? 20;

    const files = await prisma.agentSpaceFile.findMany({
      where: {
        instanceId,
        content: { contains: args.query, mode: 'insensitive' },
      },
      select: {
        id: true,
        filename: true,
        content: true,
      },
      take: limit,
    });

    const results = files.map((f) => {
      const lines = f.content.split('\n');
      const matches = lines
        .map((line, index) => {
          const lowerLine = line.toLowerCase();
          const lowerQuery = args.query.toLowerCase();
          const idx = lowerLine.indexOf(lowerQuery);
          if (idx === -1) return null;
          return {
            lineNumber: index + 1,
            line: line.substring(
              Math.max(0, idx - 40),
              idx + args.query.length + 40,
            ),
            highlightStart: idx,
            highlightEnd: idx + args.query.length,
          };
        })
        .filter(Boolean);

      return { fileId: f.id, filename: f.filename, matches };
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    };
  },
};
