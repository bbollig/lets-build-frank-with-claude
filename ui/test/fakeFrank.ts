import { vi } from "vitest";
import type { FrankClient, FrankStatus, FrankTool, ToolResult } from "../src/frank/client.js";

export const status: FrankStatus = {
  summary: "Frank 0.1.0 is up and has been running for 2m 5s.",
  version: "0.1.0",
  uptimeSeconds: 125,
  greeting: "Hello, I'm Frank. Ask me about the world I run in.",
};

export const getStatusTool: FrankTool = {
  name: "get_status",
  description: "Returns Frank's version, how long he has been running, and a greeting.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

/** A tool with one of every field kind, for the schema-driven form. */
export const everyFieldTool: FrankTool = {
  name: "list_resources",
  description: "Lists resources.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Which resource to look for." },
      limit: { type: "integer", description: "How many to return.", default: 10 },
      verbose: { type: "boolean", description: "Include every field." },
      kind: { type: "string", description: "Resource kind.", enum: ["app", "registry"] },
      filter: { type: "object", description: "Raw filter object." },
    },
    required: ["name"],
  },
};

export function fakeFrank(overrides: Partial<FrankClient> = {}): FrankClient {
  return {
    getStatus: vi.fn(async () => status),
    listTools: vi.fn(async () => [getStatusTool]),
    callTool: vi.fn(
      async (): Promise<ToolResult> => ({ isError: false, summary: status.summary, details: status }),
    ),
    isHealthy: vi.fn(async () => true),
    ...overrides,
  };
}
