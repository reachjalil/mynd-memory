# Nebius Platform Overview

Last reviewed: 2026-06-21

## Purpose

This reference pack helps an agent choose and operate the right Nebius product without freezing fast-changing details into the skill. Nebius AI Cloud is the infrastructure and managed-workload platform; Nebius Token Factory is the managed model API and post-training platform.

## Read Order

1. `10-request-routing.md` — decide which service should own the workload.
2. `20-auth-and-resource-model.md` — establish project, region, identity, and credentials.
3. `30-infrastructure-workflows.md` or `40-ai-workloads.md` — implement the selected path.
4. `50-security-observability-cost.md` — harden and operate it.
5. `60-troubleshooting.md` — diagnose failures.
6. `70-response-patterns.md` — format the result.
7. `90-official-sources.md` — verify current details.

## Platform Map

### Nebius AI Cloud

Use for cloud resources and user-supplied workloads:

- IAM, tenants, projects, regions, quotas, billing, and support.
- VPC, DNS, security groups, public connectivity, and load balancing.
- Compute VMs, GPU platforms, containers over VMs, GPU clusters, disks, and shared filesystems.
- Object Storage, Container Registry, and managed PostgreSQL.
- Managed Kubernetes and Managed Soperator/Slurm.
- Serverless AI endpoints and jobs for user-supplied container images.
- Applications marketplace and Managed MLflow.
- Observability, audit logs, KMS, and MysteryBox secrets.
- CLI, Terraform provider, gRPC API, and SDKs.

### Nebius Token Factory

Use for managed model consumption and post-training:

- OpenAI-compatible text, multimodal, embedding, and related inference APIs supported by the current catalog.
- Public serverless inference.
- Dedicated model endpoints with selected region, capacity, and autoscaling.
- Model discovery, file/dataset workflows, fine-tuning, and custom LoRA deployment where supported.
- Inference observability and integrations.

## Freshness Rule

Nebius changes quickly. Before supplying exact values, verify:

- Product availability and preview/GA status.
- Region and platform availability.
- GPU presets, quotas, and physical capacity.
- CLI and Terraform syntax, provider versions, and resource schemas.
- Token Factory model IDs, capabilities, pricing, and endpoint fields.
- Kubernetes versions, application versions, and container examples.

Use the service changelog, API/CLI discovery, provider reference, model-list endpoint, and capacity advisor. Do not rely on examples in this reference pack for dynamic catalog data.

## Source Priority

1. Current official service documentation and API reference.
2. Live CLI/API output for the caller's project.
3. Official Nebius GitHub repositories and cookbooks.
4. Nebius product pages for high-level positioning.
5. Third-party examples only when clearly labeled and verified against primary sources.
