import { describe, expect, it } from "vitest";
import { getStatus } from "../src/tools/get_status.js";
import { version } from "../src/version.js";

describe("get_status", () => {
  it("returns a summary plus typed version, uptime and greeting", async () => {
    const result = await getStatus.handler({});
    expect(getStatus.outputSchema.parse(result)).toEqual(result);
    expect(result.version).toBe(version);
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result.greeting).toMatch(/Frank/);
    expect(result.summary).toContain(version);
  });

  it("rejects unknown arguments rather than stripping them", () => {
    expect(getStatus.inputSchema.safeParse({ unexpected: true }).success).toBe(false);
  });
});
