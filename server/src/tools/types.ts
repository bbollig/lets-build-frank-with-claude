import type { z } from "zod";

/**
 * One MCP tool, shaped by ADR-002. Every tool is a module under
 * src/tools/ that exports one of these, and is listed in ./index.ts.
 */
export interface ToolDefinition<
  I extends z.ZodObject = z.ZodObject,
  O extends z.ZodObject = z.ZodObject,
> {
  /** verb_noun, lower snake_case; the verb is get, list, search or summarize. */
  name: string;
  /** One or two sentences for a model deciding whether to call the tool. */
  description: string;
  /** Strict: unknown fields are rejected, not stripped. Every field is described. */
  inputSchema: I;
  /** Must contain a top-level `summary` string plus typed detail fields. */
  outputSchema: O;
  /** Returns the structured result. Throw ToolError for a message the caller should see. */
  handler(args: z.infer<I>): z.infer<O> | Promise<z.infer<O>>;
}

/** An error whose message is safe and useful to show the caller. */
export class ToolError extends Error {
  override name = "ToolError";
}
