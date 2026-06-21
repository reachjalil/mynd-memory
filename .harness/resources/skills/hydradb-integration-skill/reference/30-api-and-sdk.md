# API and SDK Reference

## Installation

Python:

```bash
pip install "hydradb-sdk>=2,<3"
```

```python
import os
from hydra_db import HydraDB

client = HydraDB(token=os.environ["HYDRA_DB_API_KEY"])
```

TypeScript:

```bash
npm install @hydradb/sdk@^2
```

```ts
import { HydraDBClient } from "@hydradb/sdk";

const client = new HydraDBClient({
  token: process.env.HYDRA_DB_API_KEY,
});
```

For TypeScript, validate the environment variable before constructing the client so `undefined` cannot reach production silently.

## Raw HTTP

Base URL:

```text
https://api.hydradb.com
```

Headers:

```http
Authorization: Bearer <api-key>
API-Version: 2
```

Add `Content-Type: application/json` for JSON endpoints. Context ingestion uses multipart form data for files and JSON-string fields.

## Core Endpoint Map

| Task | Raw API | SDK |
| --- | --- | --- |
| Create tenant | `POST /tenants` | `client.tenants.create()` |
| Check tenant readiness | `GET /tenants/status` | `client.tenants.status()` |
| List tenants | `GET /tenants` | `client.tenants.list()` |
| Delete tenant | `DELETE /tenants` | `client.tenants.delete()` |
| List sub-tenants | `GET /tenants/sub-tenants` | Python `sub_tenants()`, TS `subTenants()` |
| Tenant statistics | `GET /tenants/stats` | `client.tenants.stats()` |
| Ingest context | `POST /context/ingest` | `client.context.ingest()` |
| Context status | `GET /context/status` | `client.context.status()` |
| Query | `POST /query` | `client.query()` |
| List context | `POST /context/list` | `client.context.list()` |
| Inspect content | `GET /context/inspect` | `client.context.inspect()` |
| Inspect relations | `GET /context/relations` | `client.context.relations()` |
| Delete context | `DELETE /context` | `client.context.delete()` |

Verify this table against the exact v2 endpoint docs, installed SDK, and v2-audience OpenAPI operation before implementing a migration. The published OpenAPI also contains legacy routes, so path presence alone is not sufficient.

## Naming Conventions

Python uses snake case:

- `tenant_id`
- `sub_tenant_id`
- `query_by`
- `max_results`
- `graph_context`

TypeScript SDK method options use camel case:

- `tenantId`
- `subTenantId`
- `queryBy`
- `maxResults`
- `graphContext`

JSON encoded inside multipart string fields remains wire-format JSON. Follow the current schema inside those strings rather than converting every nested key to the host language convention.

## Multipart JSON Strings

The unified ingest endpoint accepts several values as JSON strings:

- `document_metadata`
- `app_knowledge`
- `memories`

Do not pass a host-language array where the SDK expects a string. Serialize exactly once. Add tests that inspect the final request shape when wrapping the SDK.

## Response Handling

Raw core API responses use an envelope similar to:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "request_id": "...",
    "latency_ms": 12.3
  }
}
```

Current v2 SDK examples access payloads under `.data`. Do not hard-code a different unwrapping assumption without checking the installed SDK.

Log the request ID on failures. Avoid logging full retrieved chunks or user Memories by default.

## Minimal Query Shapes

Python:

```python
result = client.query(
    tenant_id="acme_corp",
    sub_tenant_id="user_42",
    query="What should this user know about the refund policy?",
    type="all",
    query_by="hybrid",
    mode="thinking",
    max_results=8,
    graph_context=True,
)
```

TypeScript:

```ts
const result = await client.query({
  tenantId: "acme_corp",
  subTenantId: "user_42",
  query: "What should this user know about the refund policy?",
  type: "all",
  queryBy: "hybrid",
  mode: "thinking",
  maxResults: 8,
  graphContext: true,
});
```

## Contract Verification Checklist

Before shipping:

- package major is v2,
- raw calls include `API-Version: 2`,
- endpoint path exists in v2 OpenAPI,
- option casing matches the selected SDK,
- multipart values are serialized correctly,
- response parsing matches installed package behavior,
- all current terminal status enum values are handled.
