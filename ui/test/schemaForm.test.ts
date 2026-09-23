import { describe, expect, it } from "vitest";
import { fieldsFor, parseArguments } from "../src/frank/schemaForm.js";
import { everyFieldTool, getStatusTool } from "./fakeFrank.js";

describe("fieldsFor", () => {
  it("has no fields for a tool that takes no arguments", () => {
    expect(fieldsFor(getStatusTool.inputSchema)).toEqual([]);
  });

  it("maps each JSON Schema type to a widget, keeping descriptions and defaults", () => {
    const fields = fieldsFor(everyFieldTool.inputSchema);
    expect(fields.map((f) => [f.name, f.kind])).toEqual([
      ["name", "text"],
      ["limit", "number"],
      ["verbose", "boolean"],
      ["kind", "select"],
      ["filter", "json"],
    ]);
    expect(fields[0]).toMatchObject({ required: true, description: "Which resource to look for." });
    expect(fields[1]).toMatchObject({ required: false, defaultValue: 10 });
    expect(fields[3].options).toEqual(["app", "registry"]);
  });

  it("survives a tool with no schema at all", () => {
    expect(fieldsFor(undefined)).toEqual([]);
  });
});

describe("parseArguments", () => {
  const fields = fieldsFor(everyFieldTool.inputSchema);

  it("converts each field back to its typed value", () => {
    const { values, errors } = parseArguments(fields, {
      name: "frank",
      limit: "5",
      verbose: "true",
      kind: "app",
      filter: '{"tag":"prod"}',
    });
    expect(errors).toEqual({});
    expect(values).toEqual({ name: "frank", limit: 5, verbose: true, kind: "app", filter: { tag: "prod" } });
  });

  it("omits empty optional fields rather than sending an empty string", () => {
    const { values, errors } = parseArguments(fields, { name: "frank" });
    expect(errors).toEqual({});
    expect(values).toEqual({ name: "frank" });
  });

  it("reports a missing required field", () => {
    expect(parseArguments(fields, {}).errors).toEqual({ name: "This field is required." });
  });

  it("reports a bad number and bad JSON per field", () => {
    const { errors } = parseArguments(fields, { name: "frank", limit: "many", filter: "{oops" });
    expect(errors).toEqual({ limit: "Enter a number.", filter: "Enter valid JSON." });
  });
});
