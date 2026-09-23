import react from "@vitejs/plugin-react";
// vitest's defineConfig, not vite's: it is the one that knows `test`.
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    // In production Frank serves this bundle himself, so /mcp is same-origin
    // (ADR-006). In dev the console runs on Vite's port, and these forward to
    // Frank so the app's relative URLs work unchanged.
    //
    // Do NOT set changeOrigin: the browser's `Host: localhost:5173` must reach
    // Frank as-is. His DNS-rebinding protection is on in dev (HOST=127.0.0.1)
    // and allows the localhost hostname on any port.
    proxy: {
      "/mcp": "http://localhost:3000",
      "/healthz": "http://localhost:3000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
