import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import { version } from "./version.js";

/**
 * MCP lets a tools/call omit `arguments`, which means "no arguments". The SDK
 * validates the missing value against the tool's schema as-is, and a strict
 * z.object rejects undefined, so a no-argument call to get_status would fail.
 * Treating absent arguments as {} keeps the schemas strict (ADR-002) and the
 * advertised JSON Schema accurate. Handles single and batched messages.
 */
export function defaultToolArguments(body: unknown): unknown {
  const fix = (message: unknown): unknown => {
    if (typeof message !== "object" || message === null) return message;
    const m = message as { method?: unknown; params?: { arguments?: unknown } };
    if (m.method === "tools/call" && m.params && typeof m.params === "object" && m.params.arguments === undefined) {
      return { ...m, params: { ...m.params, arguments: {} } };
    }
    return message;
  };
  return Array.isArray(body) ? body.map(fix) : fix(body);
}

/** A fresh MCP server with every tool registered. Stateless: one per request. */
export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "frank", version });
  registerTools(server);
  return server;
}
