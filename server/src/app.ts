import { existsSync } from "node:fs";
import path from "node:path";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type ErrorRequestHandler, type Express, type Request, type Response } from "express";
import type { Config } from "./config.js";
import { createMcpServer, defaultToolArguments } from "./mcp.js";

export const CONSOLE_NOT_BUILT =
  "Frank is running, but his console has not been built yet (ADR-003). MCP is at POST /mcp.";

function jsonRpcError(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: "2.0", error: { code, message }, id: null });
}

/**
 * Frank's HTTP surface (ADR-001, ADR-006). Route order is deliberate:
 * /healthz and /mcp first, then the console's static files, then the
 * console's client-side-routing fallback, then 404.
 */
export function createApp(config: Pick<Config, "host" | "publicDir">): Express {
  // Host-header validation (DNS-rebinding protection) switches on when host is
  // localhost, which is local dev. In the container host is 0.0.0.0 and the
  // SDK logs a warning: accurate, since /mcp is deliberately open (ADR-007).
  const app = createMcpExpressApp({ host: config.host });

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Stateless Streamable HTTP, as in the SDK's simpleStatelessStreamableHttp
  // example: a new server and transport per request, closed with the response.
  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createMcpServer();
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, defaultToolArguments(req.body));
    } catch (error) {
      console.error("[frank] error handling an MCP request:", error);
      if (!res.headersSent) jsonRpcError(res, 500, -32603, "Internal server error");
    }
  });

  // Stateless: no SSE stream to open and no session to delete.
  app.get("/mcp", (_req, res) => jsonRpcError(res, 405, -32000, "Method not allowed."));
  app.delete("/mcp", (_req, res) => jsonRpcError(res, 405, -32000, "Method not allowed."));

  const indexHtml = path.join(config.publicDir, "index.html");
  if (existsSync(indexHtml)) {
    app.use(express.static(config.publicDir));
    // The console routes on the client, so extensionless GETs get index.html.
    // Anything with an extension that static did not find is a missing asset.
    app.get("/{*splat}", (req, res, next) => {
      if (path.extname(req.path)) return next();
      res.sendFile(indexHtml);
    });
  } else {
    app.get("/", (_req, res) => {
      res.type("text/plain").send(CONSOLE_NOT_BUILT);
    });
  }

  app.use((_req, res) => {
    res.status(404).type("text/plain").send("Not found.");
  });

  // Plain-language errors, never a stack trace. The usual one is a malformed
  // JSON body on /mcp, rejected by the SDK app's body parser.
  const onError: ErrorRequestHandler = (error, req, res, _next) => {
    if (res.headersSent) return;
    if (error?.type === "entity.parse.failed") {
      return jsonRpcError(res, 400, -32700, "Parse error: the request body is not valid JSON.");
    }
    console.error(`[frank] unhandled error on ${req.method} ${req.path}:`, error);
    res.status(500).type("text/plain").send("Frank hit an internal error.");
  };
  app.use(onError);

  return app;
}
