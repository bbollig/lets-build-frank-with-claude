import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";
import { everyFieldTool, fakeFrank, getStatusTool, status } from "./fakeFrank.js";

/** Clicks a tool's selection radio in the table. */
async function selectTool(name: string) {
  await userEvent.click(await screen.findByRole("radio", { name: `Select ${name}` }));
}

describe("Overview", () => {
  it("shows Frank's version, uptime, greeting and connection health", async () => {
    render(<App client={fakeFrank()} />);

    expect(await screen.findByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("2m 5s")).toBeInTheDocument();
    expect(screen.getByText(status.greeting)).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("says Frank did not answer when get_status fails", async () => {
    const client = fakeFrank({
      getStatus: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
      isHealthy: vi.fn(async () => false),
    });
    render(<App client={client} />);

    expect(await screen.findByText("Frank did not answer")).toBeInTheDocument();
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
  });
});

describe("Tools", () => {
  it("lists what MCP discovery returned", async () => {
    render(<App client={fakeFrank()} initialPage="tools" />);

    expect(await screen.findByText("get_status")).toBeInTheDocument();
    expect(screen.getByText(getStatusTool.description!)).toBeInTheDocument();
  });

  it("says Frank did not answer when the list fails", async () => {
    const client = fakeFrank({ listTools: vi.fn().mockRejectedValue(new Error("nope")) });
    render(<App client={client} initialPage="tools" />);

    expect(await screen.findByText("Frank did not answer")).toBeInTheDocument();
  });

  it("calls a no-argument tool and shows its summary and JSON", async () => {
    const client = fakeFrank();
    render(<App client={client} initialPage="tools" />);

    await selectTool("get_status");
    expect(await screen.findByText("This tool takes no arguments.")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("run-tool"));

    await waitFor(() => expect(client.callTool).toHaveBeenCalledWith("get_status", {}));
    expect(await screen.findByText(status.summary)).toBeInTheDocument();
    expect(within(screen.getByTestId("tool-result")).getByText(/"version": "0.1.0"/)).toBeInTheDocument();
  });

  it("builds a form from the tool's schema and sends typed arguments", async () => {
    const client = fakeFrank({
      listTools: vi.fn(async () => [everyFieldTool]),
      callTool: vi.fn(async () => ({ isError: false, summary: "Found 2.", details: { summary: "Found 2." } })),
    });
    render(<App client={client} initialPage="tools" />);

    await selectTool("list_resources");

    expect(await screen.findByText("name (required)")).toBeInTheDocument();
    expect(screen.getByText("Which resource to look for.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("name (required)"), "frank");
    await userEvent.click(screen.getByTestId("run-tool"));

    // limit's schema default is pre-filled and sent as a number.
    await waitFor(() => expect(client.callTool).toHaveBeenCalledWith("list_resources", { name: "frank", limit: 10 }));
  });

  it("refuses to call a tool while a required field is empty", async () => {
    const client = fakeFrank({ listTools: vi.fn(async () => [everyFieldTool]) });
    render(<App client={client} initialPage="tools" />);

    await selectTool("list_resources");
    await userEvent.click(await screen.findByTestId("run-tool"));

    expect(await screen.findByText("This field is required.")).toBeInTheDocument();
    expect(client.callTool).not.toHaveBeenCalled();
  });

  it("shows a tool's own error instead of the result panel", async () => {
    const client = fakeFrank({
      callTool: vi.fn(async () => ({ isError: true, details: "Azure did not answer." })),
    });
    render(<App client={client} initialPage="tools" />);

    await selectTool("get_status");
    await userEvent.click(screen.getByTestId("run-tool"));

    expect(await screen.findByText("Azure did not answer.")).toBeInTheDocument();
    expect(screen.queryByTestId("tool-result")).not.toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("switches between the two pages", async () => {
    render(<App client={fakeFrank()} />);

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Tools" }));
    expect(await screen.findByRole("heading", { name: "Tools" })).toBeInTheDocument();
  });
});
