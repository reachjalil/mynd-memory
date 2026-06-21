# Data Model and Scoping

## Isolation Hierarchy

### Tenant

A tenant is the hard isolation boundary. Use it for customer, organization, or environment separation. Do not depend on metadata to emulate tenant isolation.

Good properties of a tenant ID:

- stable over the customer lifecycle,
- portable lowercase characters, digits, and underscores,
- not derived from mutable display names,
- different across production and non-production.

### Sub-tenant

A sub-tenant is a logical partition inside a tenant. Common mappings include user, workspace, team, project, or department.

Rules:

- Use the same value on ingestion, status checks where applicable, listing, deletion, and query.
- Do not expect a Memory written under one user sub-tenant to appear under another.
- Do not replace `sub_tenant_id` with a metadata filter.
- Avoid a default sub-tenant unless its shared-access meaning is documented.

## Knowledge vs Memories

| Dimension | Knowledge | Memories |
| --- | --- | --- |
| Typical content | PDFs, docs, app records, facts, runbooks | Preferences, history, dialogue, behavioral signals |
| Typical scope | Shared or workspace-specific | User/workspace/session-specific |
| Write selector | `type="knowledge"` | `type="memory"` |
| Query selector | `knowledge` or `all` | `memory` or `all` |
| Inference | Parsed/chunked into retrievable context | Optional inference of durable traits/facts |
| Updates | Stable-ID upsert or explicit delete | Stable-ID upsert, expiry, or delete |

Use Memories for information that should personalize future retrieval. Do not store every transient turn forever without an explicit retention and inference strategy.

## Stable IDs

A stable ID should be deterministic from the source system when possible.

Examples:

- `github_pr_repo_482`
- `slack_C123_1715012345_000100`
- `policy_refunds_v2`
- `user_42_pref_answer_style`

Benefits:

- idempotent connector retries,
- explicit replacement with upsert,
- precise status checks,
- predictable deletion,
- source-level provenance.

Avoid random IDs for records that have a durable upstream identity.

## Metadata Layers

HydraDB v2 distinguishes schema-aligned metadata from free-form per-item metadata.

### Schema-aligned metadata

Use for frequently applied exact filters such as:

- department,
- region,
- environment,
- compliance framework,
- publication status,
- language.

Declare these fields when creating the tenant and enable exact matching. Treat the schema as a database migration: review it before provisioning because current docs describe it as immutable after tenant creation.

### Additional metadata

Use for display, bookkeeping, and provider fields such as:

- author,
- provider record ID,
- version,
- assignee,
- UI labels,
- import batch.

These fields are flexible but may be filtered after broader retrieval and therefore cost more than schema-aligned filters.

### Naming drift

Official v2 pages have shown both `metadata` and `tenant_metadata` for schema-aligned ingest values. The maintained agent guide favors `tenant_metadata`. The query filter remains top-level keys in `metadata_filters`, with free-form constraints nested under `additional_metadata`.

Always inspect the current OpenAPI or installed SDK types before choosing the ingest field name.

## Filter Rules

- Use exact equality for metadata filters.
- Put schema-aligned filters at the top level of `metadata_filters`.
- Put free-form filters under `metadata_filters.additional_metadata`.
- Keep partitions in `sub_tenant_id`, not in filters.
- Add hard constraints gradually when debugging zero results.
- Re-ingest a stable ID when indexed metadata must change.

## Relations

Explicit relations can connect records that should travel together during graph-enriched retrieval.

Good uses:

- message to thread root,
- ticket to incident,
- document to superseding version,
- pull request to design decision,
- preference to supporting interaction.

Guidelines:

- Use stable related IDs.
- Store a small relation reason in properties when useful.
- Current guidance treats relations as store-local: Knowledge-to-Knowledge or Memory-to-Memory.
- Forceful relation expansion requires a query mode that supports it, currently `thinking`.
- Do not assume a relation replaces access control or metadata scoping.

## Retention and Privacy

For Memories and app-source content, define:

- whether raw dialogue is retained or converted into inferred durable state,
- expiry or TTL behavior,
- deletion by user request,
- source-system deletion propagation,
- sensitive-field minimization,
- whether content is safe to send to the downstream answer model.
