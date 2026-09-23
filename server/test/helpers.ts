import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/app.js";

export interface RunningFrank {
  port: number;
  url: string;
  close(): Promise<void>;
}

/** Boots Frank on an ephemeral port. */
export async function startFrank(options: { host?: string; publicDir?: string } = {}): Promise<RunningFrank> {
  const host = options.host ?? "127.0.0.1";
  const publicDir = options.publicDir ?? emptyPublicDir();
  const app = createApp({ host, publicDir });
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    port,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

const tempDirs: string[] = [];

export function emptyPublicDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "frank-public-"));
  tempDirs.push(dir);
  return dir;
}

/** A publicDir holding a stand-in built console. */
export function builtPublicDir(): string {
  const dir = emptyPublicDir();
  writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>Frank console</title>");
  mkdirSync(path.join(dir, "assets"));
  writeFileSync(path.join(dir, "assets", "app.js"), "console.log('frank');");
  return dir;
}

export function removeTempDirs(): void {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
}

export interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/**
 * A raw HTTP request. fetch() will not let a caller choose the Host header,
 * and the Host-validation tests need to.
 */
export function request(
  port: number,
  options: { method?: string; path?: string; host?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method: options.method ?? "GET",
        path: options.path ?? "/",
        headers: { host: options.host ?? `127.0.0.1:${port}`, ...options.headers },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      },
    );
    req.on("error", reject);
    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
}

/** A connected MCP client, the same one Claude Code and the console use. */
export async function connectClient(frank: RunningFrank): Promise<Client> {
  const client = new Client({ name: "frank-tests", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${frank.url}/mcp`)));
  return client;
}
