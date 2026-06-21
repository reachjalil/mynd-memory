# Review and Troubleshooting Checklist

## Review Procedure

### 1. Establish the contract

- Confirm v2 package and endpoint family.
- Compare version-sensitive fields with current OpenAPI or installed types.
- Identify old v1 methods or paths.

### 2. Trace one item end to end

Follow one known source through:

1. stable ID creation,
2. tenant/sub-tenant assignment,
3. ingest serialization,
4. returned ID,
5. status polling or webhook,
6. query scope and type,
7. returned chunk/source,
8. prompt formatting,
9. answer citation.

This usually reveals the first broken boundary faster than reading every helper independently.

### 3. Review isolation

- Can a caller influence `tenant_id` or `sub_tenant_id` without authorization?
- Are writes and reads guaranteed to use the same scope?
- Is metadata incorrectly used as an access-control boundary?
- Are production and non-production tenants separate?

### 4. Review lifecycle handling

- Tenant readiness is awaited.
- Context indexing is awaited.
- Polling has a deadline.
- Every terminal failure enum is handled.
- Ambiguous timeouts preserve idempotency.
- Webhook deliveries are verified and deduplicated.

### 5. Review retrieval

- `type` matches the intended store.
- Memories include the matching sub-tenant.
- `operator` is used only with compatible text retrieval.
- Forceful relations are used only in a compatible mode.
- App-aware retrieval is not mistaken for an app-only filter.
- Graph context is enabled only when needed.
- Result order is preserved.
- Prompt tokens are bounded.

### 6. Review metadata

- Hot exact filters were declared before tenant creation.
- Ingest field spelling matches current v2 schema.
- Free-form filters are nested correctly.
- Equality semantics are understood.
- Metadata updates use stable-ID re-ingestion.

### 7. Review errors and security

- Only transient errors are retried.
- Request IDs are logged.
- API key and content are not logged.
- Presigned URLs are protected.
- Retrieved content is not trusted as instructions.
- Destructive deletion paths are guarded.

## Symptom Matrix

| Symptom | First checks |
| --- | --- |
| Empty query results | indexing state, tenant/sub-tenant, `type`, metadata scope |
| Memory not returned | same sub-tenant, query `type=memory/all`, status |
| New document missing | status has not reached searchable state |
| Filter ignored | undeclared schema key, wrong nesting, naming drift |
| Exact code not found | use text query or parallel text + hybrid |
| Relations missing | graph enabled, completed graph, correct IDs, thinking mode |
| App threads poor | `query_apps`, provider fields, thread/parent relations |
| Duplicate records | unstable IDs or non-idempotent retry |
| Endless wait | no deadline or terminal status not handled |
| 401/403 | key, account permission, environment, wrong tenant |
| 409 tenant create | reconcile existing tenant instead of blind retry |
| Prompt too large | reduce results, use formatter, trim graph/additional context |

## Severity Guidance for Code Reviews

- **Critical**: cross-tenant exposure, leaked API key, destructive deletion risk.
- **High**: wrong sub-tenant, unbounded polling, non-idempotent retries, no webhook verification.
- **Medium**: ignored metadata, wrong query mode, lost citations, re-sorted chunks.
- **Low**: naming consistency, redundant options, missing comments or metrics.

## Expected Review Output

Lead with concrete findings, ordered by severity. For each finding include:

- file and line,
- observed behavior,
- impact,
- exact fix,
- test that proves the fix.

Then provide a compact patch summary and validation record. Do not bury an isolation or secret-handling defect beneath stylistic comments.
