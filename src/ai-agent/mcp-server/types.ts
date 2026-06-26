export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: any) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}
