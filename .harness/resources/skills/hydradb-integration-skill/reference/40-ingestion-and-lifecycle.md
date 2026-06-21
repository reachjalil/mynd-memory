# Ingestion and Lifecycle

## Unified Write Surface

HydraDB v2 uses `POST /context/ingest` / `client.context.ingest()` for Knowledge and Memories.

Common inputs include:

- context `type`,
- tenant and optional sub-tenant,
- upsert behavior,
- file documents,
- per-document metadata,
- pre-extracted app Knowledge,
- Memory items.

## File Knowledge

Use file ingestion when HydraDB should parse a source such as PDF, DOCX, Markdown, CSV, or text.

For each file, provide:

- a stable ID,
- a readable title,
- type and URL when available,
- source timestamp,
- schema-aligned and additional metadata,
- explicit relations when useful.

Keep file order aligned with the per-document metadata array. Validate MIME type and file size before creating the request.

## App Knowledge

Use app-source ingestion when a connector already extracted provider records.

Recommended fields:

- stable `id`,
- title,
- source/provider type,
- searchable text or Markdown,
- original URL,
- source timestamp,
- author/actor and provider IDs,
- schema-aligned filters,
- additional metadata,
- parent, thread, or related source IDs.

Normalize timestamps to ISO 8601. Preserve the upstream record ID separately from the HydraDB stable ID when they differ.

An app-aware query can improve exact IDs, actors, thread reconstruction, and hierarchy traversal, but it does not itself restrict results to app content. Use scope or metadata when that restriction is required.

## Memories

A Memory item can contain:

- stable ID,
- title,
- raw text or dialogue pairs,
- Markdown flag,
- inference flag,
- inference instructions,
- user name,
- expiry time,
- metadata,
- relations.

Use `infer: true` when the input is raw behavioral or conversational signal and the service should derive a durable preference or fact. Use `infer: false` for a fact that is already structured and should be retained as provided.

Do not infer sensitive traits casually. Establish product policy and user expectations before persisting inferred personal data.

## Idempotency

- Use stable IDs.
- Prefer upsert for connector retries and source updates.
- Store the upstream cursor or batch ID in application state.
- Do not assume a transport retry is safe when the request used random IDs.
- After an ambiguous timeout, check item status or list by stable ID before issuing a new random write.

## Tenant Readiness

Tenant creation is asynchronous. Poll tenant status until the infrastructure reports ready for ingestion.

Requirements for a poller:

- absolute deadline or maximum attempts,
- bounded interval,
- cancellation support where the runtime provides it,
- clear handling for missing tenant or permission errors,
- useful error message containing tenant ID but no secret.

## Context Status Machine

Current public guidance includes:

| Status | Searchable | Action |
| --- | --- | --- |
| `queued` | No | Continue waiting within deadline |
| `processing` | No | Continue waiting within deadline |
| `graph_creation` | Yes | Query may proceed; graph can still be incomplete |
| `completed` | Yes | Fully processed |
| `errored` or `failed` | No | Stop and surface the error |

Read the current OpenAPI enum and handle every terminal failure value it exposes.

Use `graph_creation` as an early searchable state only when the product can tolerate incomplete graph context. For graph-dependent questions, wait for `completed`.

## Webhooks

Indexing webhooks are preferable to frequent polling at scale.

Production requirements:

- public HTTPS endpoint,
- signature verification when a signing secret is configured,
- deduplication by delivery ID,
- idempotent state transition handling,
- fast acknowledgement,
- replay-safe downstream jobs,
- monitoring for failed deliveries,
- a reconciliation poll for missed events.

Do not trust a webhook tenant or sub-tenant value without matching it to an expected pending item.

## Batch Strategy

- Keep batches small enough to isolate malformed records.
- Record each returned context ID.
- Poll or reconcile statuses in groups supported by the current API.
- Separate permanent validation failures from transient service failures.
- Avoid querying immediately after sending a write without a readiness signal.
