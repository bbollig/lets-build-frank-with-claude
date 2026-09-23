import type { JsonSchema } from "./client.js";

export type FieldKind = "text" | "number" | "boolean" | "select" | "json";

export interface FormField {
  name: string;
  kind: FieldKind;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  defaultValue?: unknown;
}

/**
 * Turns a tool's input schema into fields the Tools page can render. This is
 * the payoff of ADR-002's schema discipline: a new tool shows up in the
 * console with no UI work.
 */
export function fieldsFor(schema: JsonSchema | undefined): FormField[] {
  const properties = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);
  return Object.entries(properties).map(([name, property]) => ({
    name,
    kind: kindOf(property),
    label: name,
    description: property.description,
    required: required.has(name),
    options: property.enum?.map(String),
    defaultValue: property.default,
  }));
}

function kindOf(property: JsonSchema): FieldKind {
  if (property.enum) return "select";
  switch (property.type) {
    case "string":
      return "text";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    default:
      // Objects, arrays and anything unrecognised: let the caller type JSON
      // rather than guess at a widget.
      return "json";
  }
}

export interface ParsedArguments {
  values: Record<string, unknown>;
  errors: Record<string, string>;
}

/** Turns the form's raw strings back into tool arguments, reporting bad input per field. */
export function parseArguments(fields: FormField[], raw: Record<string, string>): ParsedArguments {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const input = raw[field.name] ?? "";
    if (input.trim() === "") {
      // Absent beats guessing: an omitted optional field lets the tool's own
      // default apply, and a strict schema (ADR-002) rejects a wrong-typed "".
      if (field.required) errors[field.name] = "This field is required.";
      continue;
    }

    switch (field.kind) {
      case "number": {
        const value = Number(input);
        if (Number.isNaN(value)) errors[field.name] = "Enter a number.";
        else values[field.name] = value;
        break;
      }
      case "boolean":
        values[field.name] = input === "true";
        break;
      case "json":
        try {
          values[field.name] = JSON.parse(input);
        } catch {
          errors[field.name] = "Enter valid JSON.";
        }
        break;
      default:
        values[field.name] = input;
    }
  }

  return { values, errors };
}
