# Security, Observability, and Cost

## Security Baseline

### Identity

- Use separate human and automation identities.
- Grant access through groups and least-privilege roles.
- Scope service accounts by environment and purpose.
- Rotate and revoke credentials.
- Keep Token Factory API keys separate from AI Cloud credentials.

### Secrets

- Prefer MysteryBox or an existing secret manager.
- Pass secret references, not values.
- Protect Terraform state and CI logs.
- Do not place secrets in images, notebooks, cloud-init, manifests, URLs, or shell history.

### Network

- Default to private addresses and deny-by-default ingress.
- Expose only required ports.
- Require TLS and authentication for public services.
- Separate management access from workload traffic.
- Review egress paths for model downloads, package registries, and data transfer.

### Data

- Select region based on residency and latency requirements.
- Verify encryption behavior for the chosen storage type.
- Use customer-controlled keys only when requirements justify the operational overhead and the service supports them.
- Separate durable datasets/checkpoints from ephemeral compute-local storage.
- Enable auditability for privileged and data-access operations.

## Observability Baseline

Every production workload should expose:

- Resource state and operation history.
- Application logs with request/run correlation IDs.
- CPU, memory, disk, network, and GPU utilization where applicable.
- Request latency, throughput, error rate, saturation, queue depth, and replica count for inference.
- Job duration, progress/checkpoints, exit status, and retry count for batch/training.
- Alerts for unavailability, errors, resource exhaustion, failed jobs, and unexpected spend signals.

Nebius AI Cloud Observability combines alerts, metrics, logs, and traces for supported services. Token Factory provides inference observability and documented API integrations. Verify current preview/GA status and supported resources.

Do not declare success solely because resource creation returned an ID. Verify logs and metrics after a smoke test.

## Audit and Incident Readiness

- Enable or retain audit logs for privileged changes.
- Record project, region, resource IDs, image digest, model ID, and deployment version.
- Keep a rollback target and last-known-good configuration.
- Document who owns alerts and how to contact support.
- Preserve failure timestamps, operation IDs, logs, and a minimal reproduction before recreating resources.

## Quota and Capacity

For GPU work, check both:

1. **Quota:** the tenant/project is allowed to request the resource.
2. **Capacity:** the platform reports likely physical availability at the current timestamp.

Neither an old capacity result nor a successful plan reserves hardware. If the workload is critical, evaluate reservations or other current capacity products documented by Nebius.

## Cost Controls

- Consult current pricing pages; never hardcode prices in the skill.
- State which resources continue billing while idle, stopped, or retained.
- Size the smallest valid smoke test.
- Use autoscaling and scale-to-zero behavior only when the selected service actually supports it.
- Stop or delete test endpoints, jobs, VMs, clusters, disks, filesystems, public IPs, and dedicated capacity when no longer needed.
- Apply object/image retention and lifecycle policies.
- Tag resources with owner, environment, purpose, and expiration where supported.
- For sustained workloads, compare managed per-request/per-token economics with dedicated infrastructure, including operations cost.

## Production Gate

Before production, confirm:

- Least-privilege access reviewed.
- Secret paths tested without exposing values.
- Public surface and egress reviewed.
- Backups/checkpoints and restore path tested.
- Logs, metrics, traces, dashboards, and alerts active.
- Quota and capacity plan documented.
- Cost owner and cleanup policy assigned.
- Rollback and incident runbook available.
