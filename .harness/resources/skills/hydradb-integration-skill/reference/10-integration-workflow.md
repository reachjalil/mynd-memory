# Integration Workflow

## 1. Discover the Host Application

Before coding, inspect:

- dependency manifests and lockfiles,
- environment and secret-loading conventions,
- sync versus async execution model,
- HTTP client and retry utilities,
- logging and tracing conventions,
- existing RAG, memory, or vector-store abstractions,
- test runner and fixtures,
- deployment targets and webhook reachability.

Prefer integrating behind an existing repository/service interface. Avoid scattering direct HydraDB calls throughout handlers or UI code.

## 2. Write the Context Contract

Document four mappings:

| Concern | Decision |
| --- | --- |
| Hard isolation | What entity becomes `tenant_id`? |
| Logical partition | What entity becomes `sub_tenant_id`? |
| Shared context | Which inputs become Knowledge? |
| Personalized context | Which inputs become Memories? |

Also record:

- stable ID format,
- update and deletion rules,
- citation fields,
- hot metadata filters,
- retention or expiry requirements,
- expected read patterns.

## 3. Choose an Architecture Pattern

### Shared enterprise assistant

- One tenant per customer organization.
- Sub-tenants for workspace, team, or user only when access boundaries require them.
- Company documents and app sources as Knowledge.
- User preferences and interaction history as Memories.
- `type: "all"` for personalized, grounded answers.

### Consumer application

- One application or environment tenant when permitted by the product model.
- One sub-tenant per end user.
- Product documentation as shared Knowledge.
- Per-user state as Memories.

### Multi-environment deployment

- Separate production, staging, and test tenant IDs.
- Never share a production tenant with local or CI fixtures.
- Prefix or namespace stable IDs only within their intended environment.

### Connector pipeline

- Normalize provider records before ingestion.
- Preserve provider IDs, URLs, timestamps, authors, threads, parent-child links, and source type.
- Use stable IDs so connector retries become upserts rather than duplicates.

## 4. Implement in Vertical Slices

### Slice A: connectivity

- Initialize the client from `HYDRA_DB_API_KEY`.
- List or create a non-production tenant.
- Verify authentication and API version.

### Slice B: lifecycle

- Poll tenant readiness with a deadline.
- Ingest one small deterministic item.
- Poll context status with a deadline and terminal-error handling.

### Slice C: retrieval

- Query the exact scope and selected store.
- Assert the known item appears.
- Verify source metadata and server ranking are preserved.

### Slice D: application prompt

- Use the SDK context formatter where available.
- Add a grounding and insufficient-context instruction.
- Bound the number of chunks or final tokens.
- Preserve source title/URL or stable ID for citations.

### Slice E: production behavior

- Add retry policy only for transient failures.
- Add request ID, tenant, sub-tenant, item ID, status, and latency logging.
- Add webhook support or bounded polling.
- Add deletion and retention behavior.

## 5. Acceptance Tests

A complete integration should prove:

1. A tenant becomes ready or times out predictably.
2. A known Knowledge item can be ingested and retrieved.
3. A known Memory can be retrieved only from the matching sub-tenant.
4. A combined query returns shared Knowledge and personalized context when expected.
5. A metadata filter narrows results using a declared key.
6. An undeclared or malformed filter fails visibly in tests rather than being trusted silently.
7. A failed ingest produces a useful error with its context item ID and request ID.
8. A repeated ingest with the same ID does not create an unintended duplicate.
9. Empty retrieval results produce an explicit insufficient-context path.
10. Deletion or expiry removes data according to the product contract.

## 6. Delivery Format

For an implementation task, return:

- files changed,
- tenancy and data-model decisions,
- the vertical slice implemented,
- tests run and their results,
- API fields verified against the current v2 contract,
- risks or assumptions that still need a live HydraDB account to validate.
