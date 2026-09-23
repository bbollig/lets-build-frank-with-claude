import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Both src/config.ts (under tsx) and dist/config.js (built) sit one level below
// the package root, so this resolves the same way in dev, in tests and in the
// container, where the Dockerfile copies the console to /app/public.
export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// All settings come from environment variables (ADR-001). Nothing here is
// secret; the Azure settings arrive with ADR-009.
const EnvSchema = z.object({
  PORT: z.coerce
    .number({ error: "PORT must be a number" })
    .int("PORT must be a whole number")
    .min(1, "PORT must be between 1 and 65535")
    .max(65535, "PORT must be between 1 and 65535")
    .default(3000),
  // 127.0.0.1 keeps local dev behind the SDK's DNS-rebinding protection. The
  // Dockerfile sets 0.0.0.0, which ingress needs in order to reach Frank.
  HOST: z.string().trim().min(1, "HOST must not be empty").default("127.0.0.1"),
});

export interface Config {
  port: number;
  host: string;
  publicDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.message}`).join("\n");
    throw new Error(`Frank cannot start because his configuration is invalid:\n${problems}`);
  }
  return {
    port: parsed.data.PORT,
    host: parsed.data.HOST,
    publicDir: path.join(packageRoot, "public"),
  };
}
