import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useEffect, useState } from "react";
import type { FrankClient, FrankStatus } from "../frank/client.js";

function uptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function Value({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div>{children}</div>
    </div>
  );
}

export function Overview({ client }: { client: FrankClient }) {
  const [status, setStatus] = useState<FrankStatus>();
  const [healthy, setHealthy] = useState<boolean>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    void client.isHealthy().then((ok) => !cancelled && setHealthy(ok));
    client
      .getStatus()
      .then((result) => !cancelled && setStatus(result))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <SpaceBetween size="l">
      <Header variant="h1" description="Frank's own view of himself.">
        Overview
      </Header>

      {failed && (
        <Alert type="error" header="Frank did not answer">
          The console could not reach Frank at <code>/mcp</code>. If you are running locally, check that the server is
          up on port 3000.
        </Alert>
      )}

      <Container header={<Header variant="h2">Status</Header>}>
        {!status && !failed ? (
          <Spinner size="normal" />
        ) : (
          <ColumnLayout columns={3} variant="text-grid">
            <Value label="Connection">
              {healthy === undefined ? (
                <Spinner />
              ) : (
                <StatusIndicator type={healthy ? "success" : "error"}>
                  {healthy ? "Healthy" : "Unreachable"}
                </StatusIndicator>
              )}
            </Value>
            <Value label="Version">{status?.version ?? "-"}</Value>
            <Value label="Uptime">{status ? uptime(status.uptimeSeconds) : "-"}</Value>
          </ColumnLayout>
        )}
      </Container>

      {status && (
        <Container header={<Header variant="h2">Greeting</Header>}>
          <Box variant="p">{status.greeting}</Box>
        </Container>
      )}
    </SpaceBetween>
  );
}
