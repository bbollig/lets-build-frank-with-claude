import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import Toggle from "@cloudscape-design/components/toggle";
import { useEffect, useMemo, useState } from "react";
import type { FrankClient, FrankTool, ToolResult } from "../frank/client.js";
import { fieldsFor, parseArguments, type FormField as Field } from "../frank/schemaForm.js";

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (next: string) => void;
}) {
  switch (field.kind) {
    case "boolean":
      return (
        <Toggle checked={value === "true"} onChange={({ detail }) => onChange(String(detail.checked))}>
          {value === "true" ? "true" : "false"}
        </Toggle>
      );
    case "select":
      return (
        <Select
          selectedOption={value ? { value, label: value } : null}
          options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
          onChange={({ detail }) => onChange(detail.selectedOption.value ?? "")}
          placeholder="Choose a value"
        />
      );
    case "json":
      return <Textarea value={value} onChange={({ detail }) => onChange(detail.value)} rows={4} />;
    default:
      return (
        <Input
          type={field.kind === "number" ? "number" : "text"}
          value={value}
          onChange={({ detail }) => onChange(detail.value)}
        />
      );
  }
}

function ToolForm({ tool, client }: { tool: FrankTool; client: FrankClient }) {
  const fields = useMemo(() => fieldsFor(tool.inputSchema), [tool]);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ToolResult>();
  const [failed, setFailed] = useState(false);

  // A different tool means a different form; nothing carries over.
  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const field of fields) {
      if (field.defaultValue !== undefined) defaults[field.name] = String(field.defaultValue);
    }
    setRaw(defaults);
    setErrors({});
    setResult(undefined);
    setFailed(false);
  }, [fields]);

  async function run() {
    const { values, errors: found } = parseArguments(fields, raw);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setRunning(true);
    setFailed(false);
    try {
      setResult(await client.callTool(tool.name, values));
    } catch {
      setResult(undefined);
      setFailed(true);
    } finally {
      setRunning(false);
    }
  }

  return (
    <SpaceBetween size="l">
      <Container header={<Header variant="h2">{tool.name}</Header>}>
        <SpaceBetween size="m">
          <Box variant="p">{tool.description}</Box>
          <Form
            actions={
              <Button variant="primary" loading={running} onClick={() => void run()} data-testid="run-tool">
                Call {tool.name}
              </Button>
            }
          >
            <SpaceBetween size="m">
              {fields.length === 0 && (
                <Box variant="small" color="text-status-inactive">
                  This tool takes no arguments.
                </Box>
              )}
              {fields.map((field) => (
                <FormField
                  key={field.name}
                  label={`${field.label}${field.required ? " (required)" : ""}`}
                  description={field.description}
                  errorText={errors[field.name]}
                >
                  <FieldInput
                    field={field}
                    value={raw[field.name] ?? ""}
                    onChange={(next) => setRaw((current) => ({ ...current, [field.name]: next }))}
                  />
                </FormField>
              ))}
            </SpaceBetween>
          </Form>
        </SpaceBetween>
      </Container>

      {failed && (
        <Alert type="error" header="Frank did not answer">
          The call to <code>{tool.name}</code> never completed.
        </Alert>
      )}

      {result &&
        (result.isError ? (
          <Alert type="error" header={`${tool.name} returned an error`}>
            {String(result.details)}
          </Alert>
        ) : (
          <Container header={<Header variant="h2">Result</Header>}>
            <SpaceBetween size="s">
              {result.summary && <Box variant="p">{result.summary}</Box>}
              <Box variant="code">
                <pre data-testid="tool-result">{JSON.stringify(result.details, null, 2)}</pre>
              </Box>
            </SpaceBetween>
          </Container>
        ))}
    </SpaceBetween>
  );
}

export function Tools({ client }: { client: FrankClient }) {
  const [tools, setTools] = useState<FrankTool[]>();
  const [selected, setSelected] = useState<FrankTool[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client
      .listTools()
      .then((found) => !cancelled && setTools(found))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Everything Frank exposes over MCP. Select one to call it.">
        Tools
      </Header>

      {failed && (
        <Alert type="error" header="Frank did not answer">
          The console could not list Frank's tools.
        </Alert>
      )}

      <Table
        variant="container"
        header={<Header variant="h2" counter={tools ? `(${tools.length})` : undefined}>Available tools</Header>}
        loading={!tools && !failed}
        loadingText="Asking Frank what he can do"
        items={tools ?? []}
        selectionType="single"
        ariaLabels={{
          selectionGroupLabel: "Tool selection",
          itemSelectionLabel: ({ selectedItems }, tool) =>
            `Select ${tool.name}${selectedItems.includes(tool) ? " (selected)" : ""}`,
        }}
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        trackBy="name"
        empty={<Box textAlign="center">Frank has no tools yet.</Box>}
        columnDefinitions={[
          { id: "name", header: "Name", cell: (tool: FrankTool) => tool.name, isRowHeader: true },
          { id: "description", header: "Description", cell: (tool: FrankTool) => tool.description ?? "" },
        ]}
      />

      {selected[0] && <ToolForm key={selected[0].name} tool={selected[0]} client={client} />}
    </SpaceBetween>
  );
}
