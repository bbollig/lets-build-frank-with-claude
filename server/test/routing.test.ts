import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONSOLE_NOT_BUILT } from "../src/app.js";
import { builtPublicDir, removeTempDirs, request, startFrank, type RunningFrank } from "./helpers.js";

afterAll(() => removeTempDirs());

describe("with no console built", () => {
  let frank: RunningFrank;
  beforeAll(async () => {
    frank = await startFrank();
  });
  afterAll(() => frank.close());

  it("GET /healthz is 200 with only a status", async () => {
    const res = await request(frank.port, { path: "/healthz" });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET / says the console is not built yet", async () => {
    const res = await request(frank.port, { path: "/" });
    expect(res.status).toBe(200);
    expect(res.body).toBe(CONSOLE_NOT_BUILT);
  });

  it("any other path is 404", async () => {
    expect((await request(frank.port, { path: "/foo" })).status).toBe(404);
  });
});

describe("with a console built", () => {
  let frank: RunningFrank;
  beforeAll(async () => {
    frank = await startFrank({ publicDir: builtPublicDir() });
  });
  afterAll(() => frank.close());

  it("GET / serves the console", async () => {
    const res = await request(frank.port, { path: "/" });
    expect(res.status).toBe(200);
    expect(res.body).toContain("Frank console");
  });

  it("serves a built asset", async () => {
    const res = await request(frank.port, { path: "/assets/app.js" });
    expect(res.status).toBe(200);
    expect(res.body).toContain("frank");
  });

  it("serves index.html for a client-side route", async () => {
    const res = await request(frank.port, { path: "/tools/get_status" });
    expect(res.status).toBe(200);
    expect(res.body).toContain("Frank console");
  });

  it("404s a missing asset instead of serving index.html", async () => {
    expect((await request(frank.port, { path: "/assets/missing.js" })).status).toBe(404);
  });

  it("does not let the fallback shadow /healthz or /mcp", async () => {
    const health = await request(frank.port, { path: "/healthz" });
    expect(JSON.parse(health.body)).toEqual({ status: "ok" });
    expect((await request(frank.port, { path: "/mcp" })).status).toBe(405);
  });
});
