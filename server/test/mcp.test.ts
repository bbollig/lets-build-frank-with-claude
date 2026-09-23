import { describe, expect, it } from "vitest";
import { defaultToolArguments } from "../src/mcp.js";

describe("defaultToolArguments", () => {
  it("fills in {} when a tools/call omits arguments", () => {
    const body = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_status" } };
    expect(defaultToolArguments(body)).toEqual({ ...body, params: { name: "get_status", arguments: {} } });
  });

  it("leaves supplied arguments alone, so unknown fields still reach the strict schema", () => {
    const body = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_status", arguments: { x: 1 } } };
    expect(defaultToolArguments(body)).toBe(body);
  });

  it("leaves other methods and non-objects alone", () => {
    const list = { jsonrpc: "2.0", id: 1, method: "tools/list" };
    expect(defaultToolArguments(list)).toBe(list);
    expect(defaultToolArguments(undefined)).toBeUndefined();
    expect(defaultToolArguments("text")).toBe("text");
  });

  it("handles a batch", () => {
    const batch = [{ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_status" } }];
    expect(defaultToolArguments(batch)).toEqual([
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_status", arguments: {} } },
    ]);
  });
});
