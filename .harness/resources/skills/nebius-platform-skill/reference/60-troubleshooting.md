# Troubleshooting Nebius Workloads

## Triage Order

Diagnose from the control plane inward. Do not recreate resources before collecting evidence.

### 1. Context

- Confirm CLI version and active profile.
- Confirm tenant, project ID, and region.
- Confirm the resource ID and expected parent.
- Compare the command or schema with current docs and release notes.

### 2. Identity and permissions

- Determine whether the caller is a user or service account.
- Verify group membership and required role.
- Distinguish not-found caused by wrong project from permission denied.
- Confirm Token Factory API key and base URL are used only for Token Factory.

### 3. Quota and capacity

- Inspect the exact quota associated with the requested resource.
- Query current GPU capacity and record the result timestamp.
- Check reservation/capacity-block requirements for the selected service.
- Reduce the test size or select another valid region/preset only after verifying requirements.

### 4. Operation and resource state

- Inspect asynchronous operation status and error details.
- Check resource lifecycle state, events, and recent maintenance.
- Compare child-resource state: node groups, replicas, disks, endpoints, jobs, or pods.
- Preserve operation IDs and timestamps for support.

### 5. Network path

Validate each hop:

- Source client or workload.
- DNS resolution.
- Public/private address and route.
- Security group or network policy.
- Load balancer/endpoint.
- Container port and listener.
- TLS certificate and hostname.
- Authentication layer.

Use a small request from both inside and outside the network boundary when appropriate.

### 6. Image and runtime

- Verify image exists, digest, architecture, and registry pull access.
- Inspect entrypoint, command, port, environment, mounts, and health checks.
- Confirm GPU/runtime visibility inside the container or VM.
- Check model download, cache size, disk space, and startup duration.
- Separate application crash from resource provisioning failure.

### 7. Logs and metrics

Correlate:

- Control-plane events.
- VM/container/pod/job logs.
- GPU, CPU, memory, disk, and network metrics.
- Application latency, errors, queueing, and restarts.
- Token Factory request IDs and inference metrics.

A single log line rarely proves root cause. Align timestamps across layers.

### 8. Minimal reproduction and rollback

- Reproduce with the smallest resource and request that preserves the failure.
- Compare against a known-good image/configuration.
- Roll back one dimension at a time.
- Do not delete failed resources until logs, operation IDs, and configuration are captured.

## Service-Specific Symptoms

| Symptom | First checks |
| --- | --- |
| GPU VM or node will not create | Project/region, quota, current capacity, reservation requirement, platform/preset validity |
| Kubernetes pod pending | Node-group capacity, requests/limits, taints/tolerations, labels, PVC, image pull, cluster autoscaler |
| GPU group will not scale down | System pods on GPU nodes, missing CPU node group, disruption constraints, minimum size |
| Soperator job pending | Partition, requested resources, reservation/capacity, drained nodes, storage and user permissions |
| Serverless endpoint unavailable | Lifecycle state, image pull/startup, listener port, health, authentication, public/private path |
| Serverless job fails | Image/command, input credentials, timeout, local disk, output path, exit code, logs |
| Token Factory 401/403 | API key presence, header, base URL, project/key state, key exposure/revocation |
| Token Factory model error | Live model list, model capability, parameter support, endpoint type, fine-tuned model state |
| Terraform drift or replacement | Provider/schema version, parent IDs, imported resources, immutable fields, state backend |
| Object Storage access failure | Endpoint/region, key permissions, bucket policy, clock/signature, path vs virtual-host behavior |

## Evidence Package for Support

Prepare:

- Exact UTC timestamps.
- Tenant/project/region without secret material.
- Resource and operation IDs.
- CLI/provider/client versions.
- Redacted command or request.
- Relevant logs and metrics window.
- Capacity/quota result timestamp.
- Reproduction steps and expected vs actual behavior.
