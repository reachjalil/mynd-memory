# HydraDB v2 Overview

Verified against the official HydraDB documentation on 2026-06-21.

## Purpose

HydraDB is a context layer for AI applications. Its public v2 model combines:

- **Knowledge**: reusable documents, files, app records, and facts.
- **Memories**: user- or workspace-scoped preferences, history, and inferred durable context.
- **Query**: one retrieval surface over Knowledge, Memories, or both.
- **Context graph**: entity and relationship context that can augment ranked chunks.
- **Tenancy and metadata**: hard isolation, logical partitioning, and deterministic filtering.

The application remains responsible for deciding what to ingest, how to scope it, when to query it, how to construct the final model prompt, and how to evaluate answer quality.

## Namesake Guardrail

Confirm the user means the current product at `hydradb.com`. Do not route these tasks here:

- Ory Hydra OAuth/OIDC server work.
- Hydra configuration frameworks.
- Older Postgres data-warehouse projects branded Hydra.
- Unrelated open-source databases named HydraDB.

## Source-of-Truth Order

Cross-check current official sources rather than trusting one page in isolation:

1. Installed v2 SDK types and generated method signatures for the code being compiled.
2. `https://docs.hydradb.com/AGENTS` and the exact v2 endpoint page for maintained usage guidance.
3. `https://docs.hydradb.com/api-reference/v2/openapi.json` for request and response schemas. Use only the matching v2 surface; the published schema also contains legacy endpoints, and v2 operations may be marked with `x-fern-audiences: ["v2"]`.
4. The essentials pages linked from `https://docs.hydradb.com/llms.txt` for concepts and tuning.
5. Cookbooks for architecture patterns, never as a substitute for the current schema.

Avoid old unversioned or v1 endpoint pages when working on v2. Search the repository for old endpoint families before introducing new code, and add a request-shape test whenever official sources disagree.

## Mental Model

A production flow has two asynchronous gates:

1. A tenant must finish provisioning before it can accept writes.
2. An ingested item must progress far enough to be searchable before it can appear in query results.

A query then selects:

- a hard tenant boundary,
- an optional logical sub-tenant boundary,
- Knowledge, Memories, or both,
- a retrieval strategy,
- optional graph, recency, app-aware, and metadata behavior.

The query returns ranked chunks plus source and graph/provenance information. The application should preserve that ranking, trim to a deliberate token budget, and instruct the answer model to stay grounded.

## Version Drift Warning

The narrative documentation has used both `metadata` and `tenant_metadata` in ingest examples, while response objects use `metadata`. The v2 agent guide favors `tenant_metadata` for schema-aligned ingest fields. Resolve this against the current OpenAPI and installed SDK before editing production code.

Likewise, lifecycle failure enums have exposed both `errored` and `failed`. Treat every current terminal failure value in the schema as terminal and surface its message.

## Official Entry Points

- Documentation index: `https://docs.hydradb.com/llms.txt`
- Agent integration guide: `https://docs.hydradb.com/AGENTS`
- Quickstart: `https://docs.hydradb.com/get-started/v2/quickstart`
- Core concepts: `https://docs.hydradb.com/get-started/v2/core-concepts`
- Query guide: `https://docs.hydradb.com/essentials/v2/query`
- Metadata guide: `https://docs.hydradb.com/essentials/v2/metadata`
- API-result guide: `https://docs.hydradb.com/essentials/v2/api-results`
- Architecture: `https://docs.hydradb.com/essentials/v2/architecture`
- OpenAPI: `https://docs.hydradb.com/api-reference/v2/openapi.json`
