import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { version } from "../src/version.js";
import { connectClient, removeTempDirs, request, startFrank, type RunningFrank } from "./helpers.js";

let frank: RunningFrank;
let client: Client;

beforeAll(async () => {
  frank = await startFrank();
  client = await connectClient(frank);
});

afterAll(async () => {
  await client.close();
  await frank.close();
  removeTempDirs();
});

describe("POST /mcp over the real MCP client", () => {
  it("completes the handshake as frank", () => {
    expect(client.getServerVersion()).toEqual({ name: "frank", version });
  });

  it("lists get_status with a strict input schema", async () => {
    const { tools } = await client.listTools();
    const status = tools.find((t) => t.name === "get_status");
    expect(status).toBeDefined();
    expect(status?.inputSchema.additionalProperties).toBe(false);
    expect(status?.outputSchema?.properties).toHaveProperty("summary");
  });

  it("calls get_status with no arguments", async () => {
    const result = await client.callTool({ name: "get_status" });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ version, greeting: expect.any(String) });
  });

  it("calls get_status with empty arguments", async () => {
    const result = await client.callTool({ name: "get_status", arguments: {} });
    expect(result.isError).toBeFalsy();
  });

  it("rejects an unknown argument with a plain error", async () => {
    const result = await client.callTool({ name: "get_status", arguments: { resource_group: "someone-else" } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toMatch(/Invalid arguments/);
  });
});

describe("/mcp without a session", () => {
  it.each(["GET", "DELETE"])("%s /mcp is 405", async (method) => {
    const res = await request(frank.port, { method, path: "/mcp" });
    expect(res.status).toBe(405);
    expect(JSON.parse(res.body)).toMatchObject({ jsonrpc: "2.0", error: { code: -32000 } });
  });

  it("answers a malformed JSON body with a JSON-RPC parse error, not a stack trace", async () => {
    const res = await request(frank.port, {
      method: "POST",
      path: "/mcp",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({ error: { code: -32700 } });
    expect(res.body).not.toMatch(/at .+:\d+:\d+/);
  });
});
