import { afterEach, describe, expect, it, vi } from "vitest";
import { removeTempDirs, request, startFrank, type RunningFrank } from "./helpers.js";

let frank: RunningFrank | undefined;

afterEach(async () => {
  await frank?.close();
  frank = undefined;
  removeTempDirs();
  vi.restoreAllMocks();
});

describe("on 127.0.0.1 (local dev): DNS-rebinding protection", () => {
  it("refuses a foreign Host header", async () => {
    frank = await startFrank({ host: "127.0.0.1" });
    const res = await request(frank.port, { path: "/healthz", host: "evil.example" });
    expect(res.status).toBe(403);
  });

  it("accepts localhost on any port, which is what the Vite dev proxy forwards", async () => {
    frank = await startFrank({ host: "127.0.0.1" });
    const res = await request(frank.port, { path: "/healthz", host: "localhost:5173" });
    expect(res.status).toBe(200);
  });
});

describe("on 0.0.0.0 (the container)", () => {
  it("accepts any Host, since the public FQDN is not known to Frank", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    frank = await startFrank({ host: "0.0.0.0" });
    const res = await request(frank.port, { path: "/healthz", host: "frank-someone.example.azurecontainerapps.io" });
    expect(res.status).toBe(200);
  });
});
