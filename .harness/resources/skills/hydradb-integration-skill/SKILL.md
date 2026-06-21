---
name: hydradb-integration-skill
description: Use when building, reviewing, or debugging HydraDB v2 integrations for context, memory, ingestion, query, metadata, webhooks, or SDKs. Do NOT use for unrelated Hydra projects or generic database work.
---

# HydraDB Integration Skill

Build and review HydraDB v2 integrations that are correctly scoped, observable, idempotent, and ready to feed grounded context into an AI application.

## When to Use

Use this skill for:

- Adding HydraDB to a Python, TypeScript, or raw HTTP application.
- Designing tenants, sub-tenants, Knowledge, Memories, metadata, or explicit relations.
- Ingesting files, connector output, app records, conversation history, or user preferences.
- Tuning `/query` for document RAG, personalized retrieval, keyword search, app search, or graph-enriched recall.
- Debugging empty results, missing memories, indexing delays, metadata filters, SDK naming, webhooks, or API errors.
- Reviewing an existing HydraDB integration or migrating older endpoint usage to v2.

Do NOT use this skill for Ory Hydra, Facebook/Meta Hydra configuration, the older Postgres warehouse project formerly branded Hydra, or unrelated projects that happen to use the name HydraDB.

## Inputs

Collect what is available without asking for secret values:

- Project path, language, runtime, package manager, and framework.
- Desired user flow and the context the application must remember or retrieve.
- Proposed organization, user, workspace, project, and environment boundaries.
- Source types, expected update cadence, stable source identifiers, and citation needs.
- Latency target, quality target, context-window budget, and expected scale.
- Existing code, logs, request IDs, HTTP status codes, or malformed responses.
- Whether `HYDRA_DB_API_KEY` is configured; never request or print the key itself.

## Outputs

Produce the smallest complete deliverable that solves the task:

- A working HydraDB v2 integration or a focused patch.
- An explicit tenancy and scoping contract.
- An ingestion lifecycle with readiness and indexing handling.
- Query settings selected for the use case rather than copied blindly.
- Grounded prompt construction that preserves HydraDB ranking and source metadata.
- Retry, timeout, logging, deletion, and webhook behavior when production use is in scope.
- Validation steps, tests, and any unresolved version-sensitive assumptions.

## Current v2 Contract

Treat the official v2 docs, installed v2 SDK, and v2-audience OpenAPI entries as a cross-checked contract. Before substantial implementation work, refresh these sources when network access is available:

1. `https://docs.hydradb.com/llms.txt`
2. `https://docs.hydradb.com/AGENTS`
3. `https://docs.hydradb.com/api-reference/v2/openapi.json`
4. The exact v2 page for the endpoint being changed.

Core rules:

- Raw HTTP base URL: `https://api.hydradb.com`.
- Raw HTTP requests require bearer auth and `API-Version: 2`.
- Use `HYDRA_DB_API_KEY` from the environment or a secret manager.
- Python package: `hydradb-sdk>=2,<3`; TypeScript package: `@hydradb/sdk@^2`.
- Provisioning and ingestion are asynchronous. Poll with a bound or use indexing webhooks.
- The unified retrieval selector is `type: "knowledge" | "memory" | "all"`.
- Use the same `sub_tenant_id` on user-scoped writes and reads.
- Do not substitute metadata filters for tenant or sub-tenant isolation.
- Preserve returned chunk order unless an explicit downstream reranker is part of the design.
- Retry only transient classes such as `429`, `500`, and `503`, with bounded exponential backoff and jitter.

The published OpenAPI currently includes both legacy and v2 surfaces. Use entries marked for the v2 audience and cross-check them with the exact v2 endpoint page and installed SDK. When names differ, document the resolved spelling and add a request-shape test instead of guessing.

## Workflow

### 1. Refresh and pin the contract

- Confirm the task targets HydraDB v2, not v1 or a namesake project.
- Check the current docs index, agent guide, OpenAPI, and installed SDK major version.
- Record any version-sensitive field or response-shape assumptions.

### 2. Inspect the application

- Locate dependency manifests, environment loading, HTTP clients, existing retrieval code, tests, and deployment configuration.
- Reuse project conventions for async work, retries, logging, validation, and dependency injection.
- Search for obsolete HydraDB endpoint names before adding parallel code paths.

### 3. Define isolation before storage

Write down the mapping:

- `tenant_id` = hard isolation boundary.
- `sub_tenant_id` = user, workspace, team, project, or another logical partition.
- Separate tenant IDs for production and non-production unless the project has a stronger isolation model.
- Shared Knowledge and user Memories must have an intentional read scope; never rely on accidental defaults.

### 4. Classify each input

- Use **Knowledge** for reusable documents, files, app content, facts, and shared operational context.
- Use **Memories** for user- or workspace-scoped preferences, interaction history, behavioral signals, and inferred durable facts.
- Use `type: "all"` when an answer must be both grounded in shared Knowledge and personalized by Memories.

### 5. Design IDs and metadata

- Assign stable IDs that survive retries and support upsert.
- Declare frequently used exact-match fields in the tenant metadata schema before ingestion.
- Keep free-form display or provider fields in additional metadata.
- Use `sub_tenant_id`, not metadata, for user/workspace partitioning.
- Re-ingest with the same ID and upsert semantics when content or immutable metadata must change.

### 6. Implement the lifecycle

Build the complete path rather than only the happy-path query:

1. Initialize the v2 client without exposing the API key.
2. Create or discover the tenant.
3. Poll tenant readiness with timeout and terminal-error handling.
4. Ingest Knowledge or Memories using stable IDs.
5. Poll context status until searchable, or consume a verified webhook.
6. Query with the correct store, scope, and retrieval mode.
7. Format the ranked result into a bounded, grounded LLM context.
8. Log request IDs and useful lifecycle state without logging secrets or sensitive content.

### 7. Tune from a measured baseline

Start with one of these profiles, then evaluate on representative questions:

- Fast document retrieval: Knowledge, hybrid, fast, small `max_results`, graph disabled when not needed.
- High-quality document retrieval: Knowledge, hybrid, thinking, graph enabled, `alpha: "auto"`.
- Personalized grounded retrieval: all stores, matching sub-tenant, hybrid, thinking.
- Exact phrase or identifier lookup: text query with a compatible operator.
- App-source retrieval: Knowledge, hybrid, thinking, app-aware retrieval enabled.

Change one retrieval variable at a time and record the effect on recall, precision, latency, and prompt tokens.

### 8. Validate and harden

Test at least:

- Tenant readiness and bounded timeout behavior.
- Ingestion success, failure, and idempotent retry.
- Same-scope and wrong-scope retrieval.
- Knowledge-only, Memory-only, and combined queries when applicable.
- Metadata filters using declared and undeclared keys.
- Empty results and insufficient-context behavior.
- Retryable and non-retryable API errors.
- Webhook signature verification and duplicate delivery handling when webhooks are used.
- Deletion or retention behavior for user data when the product requires it.

## Debugging Order

When retrieval is missing or wrong, check in this order:

1. API key, v2 package, raw HTTP headers, and endpoint family.
2. Tenant existence and readiness.
3. Write-time `tenant_id` and `sub_tenant_id`.
4. Context status: queued, processing, searchable, completed, or failed.
5. Query `type` and read-time scope.
6. Declared metadata schema and filter shape.
7. Query mode, `query_by`, operator, graph flags, and app-search flags.
8. Response parsing, chunk ordering, context formatting, and downstream prompt limits.

Do not compensate for a scoping or indexing bug by broadening the query until unrelated data appears.

## Quality Checklist

- [ ] Frontmatter name matches `hydradb-integration-skill` and description is concise.
- [ ] Current v2 docs or OpenAPI were checked for version-sensitive work.
- [ ] No API key or sensitive content is hard-coded, printed, or committed.
- [ ] Tenant and sub-tenant boundaries are explicit and consistent on writes and reads.
- [ ] Knowledge and Memories are selected intentionally.
- [ ] Stable IDs and retry-safe upsert behavior are defined.
- [ ] Tenant readiness and context indexing are awaited with bounds.
- [ ] Terminal statuses include all current failure spellings exposed by the contract.
- [ ] Metadata fields are placed in schema-aligned or free-form storage intentionally.
- [ ] Query settings match the use case and are not contradictory.
- [ ] Ranked chunks are preserved and prompt context is token-bounded.
- [ ] Sources are retained for citation or provenance.
- [ ] Retry policy is limited to transient failures and logs request IDs.
- [ ] Webhooks are authenticated and deduplicated when used.
- [ ] Tests cover empty, wrong-scope, not-ready, failed-indexing, and retry paths.

## References

Read only the references needed for the task:

- `reference/00-overview.md` - source-of-truth order, mental model, and routing boundaries.
- `reference/10-integration-workflow.md` - project discovery, architecture decisions, and acceptance tests.
- `reference/20-data-model-and-scoping.md` - tenants, sub-tenants, Knowledge, Memories, metadata, IDs, and relations.
- `reference/30-api-and-sdk.md` - v2 endpoints, SDK conventions, HTTP headers, and response handling.
- `reference/40-ingestion-and-lifecycle.md` - files, app sources, Memories, polling, and webhooks.
- `reference/50-query-and-results.md` - query profiles, tuning, result formatting, and grounded prompting.
- `reference/60-production-operations.md` - retries, observability, listing, inspection, deletion, and security.
- `reference/70-review-checklist.md` - review procedure, common failures, and delivery format.
- `examples/python_v2_minimal.py` - bounded Python lifecycle example.
- `examples/typescript_v2_minimal.ts` - bounded TypeScript lifecycle example.
