import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getStatus } from "./get_status.js";
import { ToolError, type ToolDefinition } from "./types.js";

// The registry: every tool Frank exposes, and the only place tools are listed.
// test/conventions.test.ts checks each entry against ADR-002.
export const tools: ToolDefinition<any, any>[] = [getStatus];

/**
 * Wraps a tool's handler in ADR-002's output shape: typed structuredContent,
 * the same JSON as a text block for clients that ignore structuredContent
 * (the MCP spec's backwards-compatibility SHOULD), and plain-language errors
 * with the stack kept in Frank's logs.
 */
export async function runTool(tool: ToolDefinition<any, any>, args: unknown): Promise<CallToolResult> {
  try {
    const result = await tool.handler(args);
    return {
      structuredContent: result,
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  } catch (error) {
    console.error(`[frank] tool ${tool.name} failed:`, error);
    const message =
      error instanceof ToolError
        ? error.message
        : `${tool.name} failed unexpectedly. The details are in Frank's logs.`;
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

export function registerTools(server: McpServer): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      (args: unknown) => runTool(tool, args),
    );
  }
}
