import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** A tool as MCP discovery describes it. The Tools page builds its form from `inputSchema`. */
export interface FrankTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchema;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JsonSchema;
}

export interface ToolResult {
  isError: boolean;
  /** ADR-002's top-level summary, when the tool returned structured output. */
  summary?: string;
  /** structuredContent if there was any, otherwise the text Frank sent back. */
  details: unknown;
}

export interface FrankStatus {
  version: string;
  uptimeSeconds: number;
  greeting: string;
  summary: string;
}

export interface FrankClient {
  getStatus(): Promise<FrankStatus>;
  listTools(): Promise<FrankTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  isHealthy(): Promise<boolean>;
}

function textOf(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is { type: "text"; text: string } => (part as { type?: string })?.type === "text")
    .map((part) => part.text)
    .join("\n");
}

/**
 * Talks to Frank at a path relative to wherever the console is served from
 * (ADR-006): in production that is Frank himself, and in dev it is Vite's
 * proxy. There is no configured URL and no CORS.
 */
export function createFrankClient(endpoint: URL = new URL("/mcp", window.location.origin)): FrankClient {
  let connecting: Promise<Client> | undefined;

  // One connection, opened on first use and shared. A failed connect is not
  // cached, so the next call retries instead of repeating the same error.
  const connect = (): Promise<Client> => {
    connecting ??= (async () => {
      const client = new Client({ name: "frank-console", version: "0.1.0" });
      await client.connect(new StreamableHTTPClientTransport(endpoint));
      return client;
    })().catch((error: unknown) => {
      connecting = undefined;
      throw error;
    });
    return connecting;
  };

  return {
    async getStatus() {
      const result = await this.callTool("get_status", {});
      if (result.isError) throw new Error(String(result.details));
      return result.details as FrankStatus;
    },

    async listTools() {
      const client = await connect();
      const { tools } = await client.listTools();
      return tools as unknown as FrankTool[];
    },

    async callTool(name, args) {
      const client = await connect();
      const result = await client.callTool({ name, arguments: args });
      const structured = result.structuredContent as { summary?: string } | undefined;
      return {
        isError: result.isError === true,
        summary: structured?.summary,
        details: structured ?? textOf(result.content),
      };
    },

    async isHealthy() {
      try {
        const response = await fetch(new URL("/healthz", endpoint));
        if (!response.ok) return false;
        return ((await response.json()) as { status?: string }).status === "ok";
      } catch {
        return false;
      }
    },
  };
}
