# AI Workload Patterns

## Token Factory: Managed Inference

Use an OpenAI-compatible client with the documented Token Factory base URL and an API key from the environment. Discover models at runtime instead of hardcoding a catalog entry.

```python
import os
from openai import OpenAI

api_key = os.environ["NEBIUS_API_KEY"]
model_id = os.environ.get("NEBIUS_MODEL_ID")

client = OpenAI(
    base_url="https://api.tokenfactory.nebius.com/v1/",
    api_key=api_key,
)

if not model_id:
    available = client.models.list()
    raise SystemExit(
        "Set NEBIUS_MODEL_ID to a model returned by client.models.list(); "
        f"received {len(available.data)} models."
    )

response = client.chat.completions.create(
    model=model_id,
    messages=[{"role": "user", "content": "Reply with: ok"}],
    max_tokens=8,
)
print(response.choices[0].message.content)
```

Production additions:

- Set request timeouts and bounded retries.
- Log request IDs and usage without logging prompts or secrets by default.
- Handle rate limits and transient errors.
- Set explicit token limits and model parameters.
- Validate structured output or tool calls before acting on them.
- Track latency, throughput, errors, and spend.

## Token Factory: Dedicated Endpoints

Choose a dedicated endpoint when isolated capacity, predictable throughput, selected region/data residency, custom autoscaling, or a supported custom/fine-tuned model is required.

Before creating one, verify:

- Current supported models and performance templates.
- Region and GPU options.
- Minimum/maximum replicas and scale behavior.
- Control-plane API vs data-plane inference URL.
- Authentication, network exposure, and observability.
- Stop/delete semantics and cost when idle.

Do not assume a public serverless model ID can be copied unchanged into a dedicated-endpoint request.

## Token Factory: Fine-Tuning

A robust managed fine-tuning workflow:

1. Confirm the base model supports the intended tuning method.
2. Validate and sanitize the training/validation dataset.
3. Keep raw, cleaned, and submitted dataset artifacts separate.
4. Upload files or create datasets with non-secret metadata.
5. Create a job with explicit hyperparameters and seed where supported.
6. Poll status with bounded intervals and surface failure details.
7. Evaluate the result against a held-out set.
8. Deploy only after quality and safety checks.
9. Record base model, dataset version, parameters, job ID, and deployed model ID.

Never claim support for a model or tuning method without checking the current catalog.

## Serverless AI Endpoint

Use for an interactive user-supplied container.

Required design points:

- Image and immutable digest.
- Listening port and health behavior.
- CPU/GPU platform and preset discovered at runtime.
- Environment and secret injection.
- Storage mounts and model/data loading path.
- Public/private access and authentication.
- Startup time, request timeout, concurrency, and scaling expectations.
- Logs, resource metrics, and deletion/stop policy.

Smoke test the authenticated endpoint with the smallest request that proves the container is healthy.

## Serverless AI Job

Use for finite work such as training, evaluation, preprocessing, simulation, or batch inference.

Required design points:

- Image, command, arguments, and exit-code contract.
- Input and output locations outside ephemeral local storage.
- Timeout, retry/idempotency behavior, and checkpointing.
- Resource request and capacity check.
- Logs and final status.
- Automatic cleanup and retention of useful artifacts.

A job should be restartable without corrupting outputs. Use unique run IDs or atomic output publication.

## Applications

Use Applications when a supported package provides the required tool with less operational work. Check deployment options because an application may support standalone or Kubernetes deployment with different lifecycle and pricing behavior.

Verify:

- Current application version and configuration fields.
- Deployment target and prerequisites.
- Storage persistence.
- Network exposure and authentication.
- Upgrade and deletion behavior.

## Managed MLflow

Use Managed MLflow for experiment tracking and model registry when the user does not need to operate the service itself.

Capture:

- Project/cluster and access path.
- Artifact storage.
- Authentication and client configuration.
- Experiment/model naming conventions.
- Maintenance, monitoring, and backup/export expectations.

## Data Path

For training and serving, document the complete path:

1. Dataset source.
2. Transfer to Object Storage or shared storage.
3. Runtime credentials and permissions.
4. Local cache or mount behavior.
5. Checkpoint/output destination.
6. Model registration or deployment.
7. Retention and deletion.

This prevents an apparently successful compute deployment from failing later on data access, persistence, or cleanup.
