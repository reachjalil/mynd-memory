# Query and Results

## Store Selection

| Goal | `type` |
| --- | --- |
| Shared document or app context | `knowledge` |
| User preferences or history | `memory` |
| Personalized answer grounded in shared context | `all` |

A Memory query normally requires the same `sub_tenant_id` used at ingestion.

## Retrieval Controls

- `query_by: "hybrid"`: semantic and lexical retrieval.
- `query_by: "text"`: keyword/phrase-oriented retrieval.
- `mode: "fast"`: latency-oriented.
- `mode: "thinking"`: richer expansion, reranking, graph traversal, and relation behavior.
- `max_results`: upper bound for primary chunks.
- `alpha`: semantic-versus-lexical balance or automatic selection.
- `recency_bias`: boost newer content.
- `graph_context`: include graph information.
- `query_forceful_relations`: retrieve explicitly related context; effective only in a compatible mode.
- `query_apps`: enable app-aware retrieval behavior without restricting the corpus to apps.
- `metadata_filters`: deterministic scope inside the tenant/sub-tenant boundary.
- `additional_context`: short factual query hint, not an access-control filter.

## Starting Profiles

### Fast document RAG

```text
type=knowledge
query_by=hybrid
mode=fast
graph_context=false
max_results=5..10
```

### High-quality document RAG

```text
type=knowledge
query_by=hybrid
mode=thinking
graph_context=true
alpha=auto
```

### Personalized grounded answer

```text
type=all
sub_tenant_id=<user-or-workspace>
query_by=hybrid
mode=thinking
```

### Exact token or phrase

```text
type=knowledge
query_by=text
operator=phrase
```

Use text search for error codes, SKUs, function names, and exact phrases. A useful advanced pattern is to run hybrid and text queries in parallel, then deduplicate by chunk ID while guaranteeing exact hits are represented.

### Recent operational state

Use hybrid retrieval, a modest recency bias, and an exact metadata scope for source type, environment, or publication status. Do not let recency replace correctness.

## Tuning Sequence

1. Verify indexing and scope before tuning.
2. Start with hybrid retrieval and ten or fewer results.
3. Evaluate representative queries with expected sources.
4. Adjust one variable at a time.
5. Lower semantic weight for literal identifiers; raise it for conceptual queries.
6. Add graph context only when relationships improve the answer.
7. Add recency only when newer information should dominate.
8. Reduce final chunks based on prompt budget and answer quality.

Track at least:

- source recall,
- irrelevant-source rate,
- answer correctness,
- citation correctness,
- insufficient-context precision,
- retrieval latency,
- context tokens.

## Result Handling

The retrieval result includes ranked chunks, sources, and optional graph/additional context.

Rules:

- Treat chunks as the primary answer context.
- Preserve the server order unless a deliberate reranker replaces it.
- Keep source IDs, titles, URLs, timestamps, and metadata attached.
- Resolve explicitly related context through the IDs returned by the service.
- Do not dump unbounded raw JSON into the model prompt.
- Use the official SDK formatter when its installed version provides one.

Current guides reference:

- Python: `build_string(result)` from `hydra_db.helpers`.
- TypeScript: `buildString(result)` from `@hydradb/sdk`.

Verify helper names against the installed v2 package because narrative pages have also used older formatter names.

## Prompt Contract

A grounded answer prompt should state:

- answer only from supplied context,
- say when context is insufficient,
- do not invent missing details,
- preserve user preference only when Memory context supports it,
- cite source title, URL, or stable ID when available,
- prefer current facts when temporal conflicts are explicit.

Keep Knowledge and Memories separately labeled when the answer model must distinguish source facts from user preferences. Otherwise, `type: "all"` can provide one ranked stream.

## Empty or Weak Results

Do not immediately broaden all scopes. Diagnose:

1. item status,
2. tenant/sub-tenant match,
3. selected `type`,
4. metadata filter shape,
5. literal versus conceptual query mode,
6. result limit,
7. graph/app flags,
8. context formatter or downstream truncation.

When the retrieved evidence does not support an answer, return an explicit insufficient-context result rather than asking the model to fill the gap.
