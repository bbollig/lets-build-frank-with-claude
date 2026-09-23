import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { version } from "./version.js";

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = createApp(config);
const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) {
    console.error(`[frank] could not listen on ${config.host}:${config.port}: ${error.message}`);
    process.exit(1);
  }
  console.log(`[frank] ${version} listening on http://${config.host}:${config.port} (MCP at /mcp)`);
});

function shutdown(signal: string): void {
  console.log(`[frank] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  // Streamable HTTP responses can hold connections open; do not wait forever.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
