import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runTool, tools } from "../src/tools/index.js";
import { ToolError, type ToolDefinition } from "../src/tools/types.js";

// ADR-002, enforced. A new verb means superseding ADR-002, not editing this regex.
const NAME = /^(get|list|search|summarize)_[a-z0-9]+(_[a-z0-9]+)*$/;

describe.each(tools.map((tool) => [tool.name, tool] as const))("tool %s follows ADR-002", (_name, tool) => {
  it("is named verb_noun from the closed verb set", () => {
    expect(tool.name).toMatch(NAME);
  });

  it("has a one-or-two-sentence description", () => {
    expect(tool.description.trim().length).toBeGreaterThan(0);
    const sentences = tool.description.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 0);
    expect(sentences.length).toBeLessThanOrEqual(2);
  });

  it("describes every input parameter", () => {
    for (const [key, field] of Object.entries(tool.inputSchema.shape as Record<string, z.ZodType>)) {
      expect(field.description, `parameter ${key}`).toBeTruthy();
    }
  });

  it("rejects unknown input fields", () => {
    expect(tool.inputSchema.safeParse({ __not_a_real_parameter__: 1 }).success).toBe(false);
  });

  it("outputs a top-level summary string", () => {
    const summary = (tool.outputSchema.shape as Record<string, z.ZodType>).summary;
    expect(summary).toBeInstanceOf(z.ZodString);
  });
});

it("tool names are unique", () => {
  expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
});

describe("runTool", () => {
  const failing = (error: Error): ToolDefinition => ({
    name: "get_failure",
    description: "Always fails.",
    inputSchema: z.strictObject({}),
    outputSchema: z.object({ summary: z.string() }),
    handler() {
      throw error;
    },
  });

  it("returns structuredContent and the same JSON as text", async () => {
    const result = await runTool(tools[0], {});
    expect(result.isError).toBeUndefined();
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify(result.structuredContent) }]);
  });

  it("shows a ToolError's message to the caller", async () => {
    const result = await runTool(failing(new ToolError("Azure did not answer.")), {});
    expect(result).toEqual({ isError: true, content: [{ type: "text", text: "Azure did not answer." }] });
  });

  it("hides any other error's message and stack", async () => {
    const result = await runTool(failing(new Error("secret internal detail")), {});
    expect(result.isError).toBe(true);
    const text = JSON.stringify(result.content);
    expect(text).not.toContain("secret internal detail");
    expect(text).not.toMatch(/at .+:\d+:\d+/);
  });
});
