import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig, packageRoot } from "../src/config.js";

describe("loadConfig", () => {
  it("defaults to port 3000 on 127.0.0.1", () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.host).toBe("127.0.0.1");
  });

  it("reads PORT and HOST from the environment", () => {
    const config = loadConfig({ PORT: "8080", HOST: "0.0.0.0" });
    expect(config.port).toBe(8080);
    expect(config.host).toBe("0.0.0.0");
  });

  it("serves the console from <package root>/public, where the Dockerfile puts it", () => {
    expect(loadConfig({}).publicDir).toBe(path.join(packageRoot, "public"));
  });

  it.each(["abc", "0", "70000", "3000.5"])("rejects PORT=%s with a plain message", (PORT) => {
    expect(() => loadConfig({ PORT })).toThrow(/configuration is invalid[\s\S]*PORT/);
  });

  it("rejects an empty HOST", () => {
    expect(() => loadConfig({ HOST: " " })).toThrow(/HOST must not be empty/);
  });
});
