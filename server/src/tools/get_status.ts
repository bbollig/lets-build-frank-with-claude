import { z } from "zod";
import { version } from "../version.js";
import type { ToolDefinition } from "./types.js";

const GREETING = "Hello, I'm Frank. Ask me about the world I run in.";

const inputSchema = z.strictObject({});

const outputSchema = z.object({
  summary: z.string().describe("One sentence stating Frank's version and uptime."),
  version: z.string().describe("Frank's version, from his package.json."),
  uptimeSeconds: z.number().int().nonnegative().describe("Whole seconds since Frank's process started."),
  greeting: z.string().describe("A short greeting from Frank."),
});

function formatUptime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export const getStatus: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "get_status",
  description:
    "Returns Frank's version, how long he has been running, and a greeting. " +
    "Use it to check that Frank is reachable and which version is deployed; it takes no arguments.",
  inputSchema,
  outputSchema,
  handler() {
    const uptimeSeconds = Math.floor(process.uptime());
    return {
      summary: `Frank ${version} is up and has been running for ${formatUptime(uptimeSeconds)}.`,
      version,
      uptimeSeconds,
      greeting: GREETING,
    };
  },
};
