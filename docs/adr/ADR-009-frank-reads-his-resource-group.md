# ADR-009: Frank reads what is running in his own resource group

**Status:** Proposed
**Date:** 2026-09

**Extends ADR-002** and **depends on ADR-010's runtime credential**.
**Supersedes ADR-004's Identity bullet** — *"the Container App gets a
system-assigned managed identity at creation... ADR-009 decides exactly what
read access it receives"*. There is no managed identity: ADR-010 removed it in
prose without declaring the supersession, and `deploy.yml` creates the app
without `--system-assigned`. This ADR is the one that clause defers to, so it
closes it. The rest of ADR-004 stands.

## Context

Frank's premise is that he reports on the world he runs in, and today he cannot:
`get_status` knows his own process and nothing else. ADR-010 already put the
means in his container, so nothing has to be provisioned here — and its terms
bound what we may expose: one resource group shared by the whole class, and a
credential holding **Contributor**. ADR-007's rejection adds a third: `POST
/mcp` answers anyone.

## Decision

- Add `@azure/identity` and `@azure/arm-resources` to `server/`.
- **Scope comes from the environment, never from a caller.**
  `AZURE_RESOURCE_GROUP` and `AZURE_SUBSCRIPTION_ID` become **optional**
  settings in `config.ts`; `DefaultAzureCredential` reads the client, tenant and
  secret variables itself. No tool takes a resource group or subscription
  argument.
- **Frank boots without any of it.** The credential and ARM client are built
  lazily on first use, so `npm run dev` is unaffected; absent configuration or a
  failed call returns `isError` naming what is missing.
- **Tools receive a context**, not globals: the registry hands each handler the
  resource group and a client factory, which changes the `ToolDefinition`
  signature and its registration.
- Two tools, named per ADR-002 and returning its summary-plus-typed-fields shape:
  - **`list_resources`** — name, type and location per resource. An optional
    `type` matches the full ARM type (`Microsoft.App/containerApps`),
    case-insensitively.
  - **`summarize_resource_group`** — counts by type, plus the group's name and
    location.
- **List and get calls only.** The conventions test constrains tool *names*, not
  call sites, so add two tests: neither tool accepts a scope-widening argument,
  and the module calls no write method.

## Consequences

- The class sees a tool return a live fact no model could have known from its
  weights.
- **Frank lists the whole cohort's apps, not just yours**, readable by anyone
  with the URL. No ADR-007 trigger fired — inventory only, disposable
  subscription, nothing survives the day — so this widening is **unlisted**:
  ADR-007 reasoned about one seat's group and ADR-010 made it everyone's. Teach
  that gap rather than lean on a condition nobody wrote.
- **IAM does not enforce read-only here.** Contributor would permit writes; only
  the tool surface and its tests prevent them, which makes read-only a review
  rule rather than a guarantee.
- **A new way to be slow and to fail.** Two SDK packages, a cold start that pays
  an Azure round trip, and demos that break on throttling or an ARM outage while
  Frank himself is healthy.
- Rejected: a `resource_group` parameter (lets a caller redirect Frank; scope
  must not be caller-controlled); `Reader` on a managed identity (ADR-010
  removed the identity, and students cannot assign roles); Azure Resource Graph
  (one API for everything, at the cost of another provider and RBAC surface for
  one group); raw ARM JSON (loses ADR-002's shape, leaks unreviewed properties).
