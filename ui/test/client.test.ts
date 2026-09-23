import { afterEach, describe, expect, it, vi } from "vitest";
import { createFrankClient } from "../src/frank/client.js";

const connect = vi.hoisted(() => vi.fn());
const listTools = vi.hoisted(() => vi.fn());
const callTool = vi.hoisted(() => vi.fn());
const transport = vi.hoisted(() => vi.fn());

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: class {
    connect = connect;
    listTools = listTools;
    callTool = callTool;
  },
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: transport,
}));

afterEach(() => vi.clearAllMocks());

describe("createFrankClient", () => {
  it("talks to /mcp on the origin the console was served from", async () => {
    listTools.mockResolvedValue({ tools: [] });
    await createFrankClient().listTools();
    expect(transport).toHaveBeenCalledWith(new URL("/mcp", window.location.origin));
  });

  it("connects once and reuses the connection", async () => {
    const client = createFrankClient();
    listTools.mockResolvedValue({ tools: [] });
    await Promise.all([client.listTools(), client.listTools()]);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("retries the connection after a failure instead of caching it", async () => {
    const client = createFrankClient();
    connect.mockRejectedValueOnce(new Error("refused"));
    await expect(client.listTools()).rejects.toThrow("refused");

    listTools.mockResolvedValue({ tools: [] });
    await expect(client.listTools()).resolves.toEqual([]);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("prefers structuredContent and surfaces ADR-002's summary", async () => {
    callTool.mockResolvedValue({
      structuredContent: { summary: "Frank 0.1.0 is up.", version: "0.1.0" },
      content: [{ type: "text", text: "ignored" }],
    });
    const result = await createFrankClient().callTool("get_status", {});
    expect(result).toEqual({
      isError: false,
      summary: "Frank 0.1.0 is up.",
      details: { summary: "Frank 0.1.0 is up.", version: "0.1.0" },
    });
  });

  it("falls back to text content for an error result", async () => {
    callTool.mockResolvedValue({ isError: true, content: [{ type: "text", text: "Azure did not answer." }] });
    const result = await createFrankClient().callTool("get_status", {});
    expect(result).toEqual({ isError: true, summary: undefined, details: "Azure did not answer." });
  });

  it("reports health from /healthz, and unhealthy when the fetch fails", async () => {
    const client = createFrankClient();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ok" }))));
    await expect(client.isHealthy()).resolves.toBe(true);

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    await expect(client.isHealthy()).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});
