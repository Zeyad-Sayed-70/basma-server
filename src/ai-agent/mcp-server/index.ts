import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spaceListTool } from './tools/space-list';
import { spaceReadTool } from './tools/space-read';
import { spaceSearchTool } from './tools/space-search';
import { noteRecordTool } from './tools/note-record';
import { studentProfileTool } from './tools/student-profile';

const tools = [
  spaceListTool,
  spaceReadTool,
  spaceSearchTool,
  noteRecordTool,
  studentProfileTool,
];

const server = new Server(
  {
    name: 'basma-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find((t) => t.name === name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    return await tool.handler(args ?? {});
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('basma-mcp server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in basma-mcp server:', error);
  process.exit(1);
});
