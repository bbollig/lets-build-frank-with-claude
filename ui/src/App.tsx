import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useState } from "react";
import type { FrankClient } from "./frank/client.js";
import { Overview } from "./pages/Overview.js";
import { Tools } from "./pages/Tools.js";

export type PageId = "overview" | "tools";

export interface AppProps {
  /** Injected so tests can render against a fake Frank. */
  client: FrankClient;
  initialPage?: PageId;
}

/** Two pages (ADR-003), switched in state — there is nothing here to deep-link to. */
export function App({ client, initialPage = "overview" }: AppProps) {
  const [page, setPage] = useState<PageId>(initialPage);

  return (
    <>
      <div id="header">
        <TopNavigation identity={{ href: "#", title: "Frank" }} />
      </div>
      <AppLayout
        headerSelector="#header"
        toolsHide
        navigation={
          <SideNavigation
            activeHref={`#${page}`}
            header={{ href: "#overview", text: "Console" }}
            onFollow={(event) => {
              event.preventDefault();
              setPage(event.detail.href.replace("#", "") as PageId);
            }}
            items={[
              { type: "link", text: "Overview", href: "#overview" },
              { type: "link", text: "Tools", href: "#tools" },
            ]}
          />
        }
        content={page === "overview" ? <Overview client={client} /> : <Tools client={client} />}
      />
    </>
  );
}
