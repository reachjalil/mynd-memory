# Production Operations

## Retry Policy

Retry transient HTTP classes only:

- `429` rate limited,
- `500` internal failure,
- `503` temporary unavailability.

Use:

- bounded exponential backoff,
- random jitter,
- per-attempt timeout,
- total deadline,
- cancellation,
- retry metrics.

Do not retry authentication, authorization, validation, not-found, or ordinary conflict errors without changing the request or confirming idempotency.

## Timeouts

Set separate budgets for:

- client connection,
- fast query,
- thinking query,
- tenant readiness,
- context indexing,
- webhook processing.

Do not use infinite `while True` loops in production. A timeout error should identify the operation, tenant, sub-tenant when safe, context ID, last state, and elapsed time.

## Observability

Capture structured fields:

- operation,
- request ID,
- tenant ID,
- sub-tenant ID where permitted,
- context/source ID,
- selected query type and mode,
- HTTP status or SDK error class,
- lifecycle status,
- latency,
- retry count,
- result count.

Avoid logging:

- API keys or authorization headers,
- full file contents,
- raw Memories,
- unredacted prompts or returned chunks by default.

## Common Error Classes

| HTTP | Meaning | Typical action |
| --- | --- | --- |
| 400 | malformed or conflicting parameters | Fix request |
| 401 | missing or invalid key | Fix secret/configuration |
| 403 | authenticated but not permitted | Fix plan/permissions/scope |
| 404 | tenant or context item not found | Verify ID and isolation scope |
| 409 | conflict such as duplicate tenant | Reconcile desired state |
| 422 | semantic validation failure | Fix data shape |
| 429 | rate limited | Retry with backoff |
| 500 | server error | Retry within bound |
| 503 | temporary unavailability | Retry within bound |

Surface the service error code and request ID when available.

## Webhook Security

- Require HTTPS.
- Verify the documented signature header when a secret is configured.
- Compare signatures in constant time.
- Store delivery IDs and ignore duplicates.
- Reject stale or malformed events according to product policy.
- Match the event to a pending context ID and expected tenant.
- Process asynchronously after a quick acknowledgement.

## Browse and Inspect

Use context listing to:

- reconcile connector state,
- inspect pagination,
- confirm metadata,
- find duplicates,
- audit expected sources.

Use content inspection to:

- compare parsed text with the original,
- retrieve a short-lived source URL where supported,
- debug parsing or citation issues.

Treat presigned URLs as secrets with a limited lifetime. Do not log or persist them unnecessarily.

## Graph Inspection

Use relation inspection for:

- provenance debugging,
- validating explicit links,
- explaining multi-hop retrieval,
- confirming thread or parent-child structure.

Paginate rather than assuming all relations fit in one response.

## Deletion and Retention

Implement deletion by stable ID for both Knowledge and Memories. For tenant deletion, require an explicit destructive-operation path and protect it from accidental environment mix-ups.

For user data, define:

- deletion request mapping,
- connector tombstone handling,
- Memory expiry,
- cache invalidation,
- downstream prompt/log retention,
- audit evidence.

## Security Review

- Key lives in a secret manager or environment injection.
- Tenant ID cannot be chosen freely by an untrusted caller without authorization.
- Sub-tenant access is enforced by application authorization before the HydraDB request.
- User-supplied metadata cannot broaden scope.
- Retrieved content is treated as untrusted prompt input.
- Prompt-injection defenses are applied before tool execution or sensitive actions.
- Sensitive data is minimized before ingestion and model use.

## Operational Reconciliation

At least one periodic job should be able to:

- list expected versus stored items,
- find writes stuck outside terminal states,
- retry missed webhook processing safely,
- report duplicate or orphaned IDs,
- verify deletion propagation,
- measure retrieval quality on a stable evaluation set.
