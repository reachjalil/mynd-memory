# Response Patterns

Use these structures to keep Nebius work actionable.

## Architecture or Service Selection

```text
Selected path: <service>
Reason: <why it is the smallest suitable managed layer>
Project/region: <explicit value or placeholder>
Key constraints: <model/runtime, GPU, data, latency, security, budget>
Alternatives rejected: <brief tradeoff>
Implementation: <ordered resource graph>
Validation: <control-plane + workload checks>
Cleanup: <what stops billing or removes data>
```

## Provisioning Change

```text
Assumptions
- <assumption>

Files
- <path>: <purpose>

Preflight
1. Confirm profile/project/region.
2. Check quota/capacity.
3. Confirm secret references.

Apply
1. <format/validate/plan or dry-run>
2. <authorized change>

Verify
1. <resource state>
2. <smoke test>
3. <logs/metrics>

Rollback / teardown
- <safe command or configuration reversal>
```

## Troubleshooting Result

```text
Observed
- <facts only>

Most likely layer
- <identity | quota/capacity | control plane | network | image/runtime | application>

Evidence
- <operation, log, metric, or request result>

Fix
- <minimal change>

Verify
- <specific expected result>

Preserve for support
- <IDs, timestamps, logs>
```

## Token Factory Integration

```text
API mode: <public serverless | dedicated>
Base URL: <verified current URL>
Model: discovered at runtime via model list
Secret: NEBIUS_API_KEY (value never printed)
Client changes: <files>
Reliability: timeouts, retries, error handling
Observability: latency, tokens, errors, request IDs
Smoke test: <minimal request>
```

## Handling Missing Values

Do not turn missing information into invented values. Use clear placeholders:

- `<PROJECT_ID>`
- `<TENANT_ID>`
- `<REGION>`
- `<RESOURCE_ID>`
- `<MODEL_ID_FROM_LIVE_CATALOG>`
- `<CURRENT_PLATFORM_PRESET>`

When the task can proceed without clarification, choose a documented default strategy and state the assumption. When a real change would be unsafe without a missing value, prepare the configuration and preflight commands without applying it.

## Completion Standard

A strong final result contains:

- One service choice, not an unranked list.
- Current discovery steps for dynamic values.
- Secure credential handling.
- Copyable implementation artifacts.
- Explicit validation.
- Cost and teardown implications.
