---
name: nebius-platform-skill
description: Use when deploying, automating, or troubleshooting Nebius AI Cloud or Token Factory with CLI, Terraform, APIs, Kubernetes, Slurm, Serverless AI, or OpenAI-compatible inference. Do NOT use for Nebius company, investor, or stock research.
---

# Nebius Platform

Use current Nebius documentation to design, provision, deploy, and operate workloads across Nebius AI Cloud and Nebius Token Factory. Prefer the smallest managed service that satisfies the workload, and make every infrastructure change reproducible, secure, observable, and removable.

## When to Use

Use this skill for explicit Nebius work, including:

- Nebius AI Cloud projects, IAM, VPC, Compute, GPU capacity, storage, registries, Kubernetes, Soperator, MLflow, Applications, Serverless AI, observability, or secrets.
- Nebius CLI, Terraform provider, API, Go/Python SDK, `kubectl`, Helm, Slurm, or S3-compatible workflows.
- Nebius Token Factory inference, embeddings, model discovery, fine-tuning, dedicated endpoints, or OpenAI-compatible API integration.
- Migration, architecture, cost, security, reliability, and troubleshooting decisions specific to Nebius.

Do not use this skill for generic cloud work when Nebius is not selected, another cloud is named, local-only development, or Nebius corporate, investor, earnings, or stock analysis.

## Inputs

Gather or infer as much of the following as the task requires:

- Desired outcome and workload type: inference, training, batch, interactive service, cluster, storage, or platform automation.
- Existing repository, manifests, container image, model, dataset, and deployment state.
- Tenant, project, region, environment, naming conventions, and ownership labels.
- Expected GPU/CPU, memory, storage, network, latency, throughput, uptime, and scaling needs.
- Preferred interface: console, CLI, Terraform, SDK/API, `kubectl`/Helm, Slurm, or OpenAI-compatible client.
- Security, data residency, budget, quota, capacity, and cleanup constraints.

Do not ask for secrets in chat. Work with environment-variable names, local credential files, CLI profiles, secret references, and placeholders.

## Outputs

Produce only the artifacts needed for the task, such as:

- A service-selection decision with assumptions and tradeoffs.
- Copyable CLI commands, Terraform, application code, Kubernetes/Helm manifests, Slurm scripts, or runbooks.
- A resource graph covering project, region, IAM, network, storage, compute, and workload dependencies.
- Validation, observability, rollback, and teardown steps.
- A concise record of files changed, resources created, unresolved constraints, and cost-sensitive choices.

## Workflow

### 1. Route the request

Choose the service before writing commands. Read [request routing](reference/10-request-routing.md).

- Use **Token Factory** for managed model APIs, embeddings, fine-tuning, public serverless inference, or dedicated model endpoints.
- Use **Serverless AI** to run the user's own container as an interactive endpoint or finite background job without managing a cluster.
- Use **Applications** for supported turnkey software such as notebooks, model servers, and workflow tools.
- Use **Compute** for full VM, GPU, driver, kernel, or custom runtime control.
- Use **Managed Kubernetes** for long-lived, multi-service, portable container platforms.
- Use **Managed Soperator** for Slurm-based distributed AI or HPC workloads.
- Use **Managed MLflow** for experiment tracking and model registry workflows.

Do not confuse Token Factory with Serverless AI: Token Factory serves supported models through managed APIs; Serverless AI runs container images supplied by the user.

### 2. Establish live context

Before exact commands or architecture choices:

1. Inspect the repository and existing configuration.
2. Check current official documentation and the Nebius changelog.
3. Confirm the active project and region; use one CLI profile per project.
4. Check IAM permissions, quotas, and GPU capacity where relevant.
5. Discover current resource IDs, platform presets, model IDs, API fields, and versions instead of guessing them.

Use marketing pages for product orientation only. Use `docs.nebius.com`, `docs.tokenfactory.nebius.com`, official API references, and official Nebius repositories for implementation details.

### 3. Choose the control interface

- **Console:** guided exploration or a one-off operation.
- **CLI:** discovery, diagnostics, scripting, and small imperative changes.
- **Terraform:** persistent or multi-resource infrastructure that must be reviewed, repeated, or promoted between environments.
- **SDK/API:** application-driven control-plane automation.
- **OpenAI-compatible client:** Token Factory inference and supported model operations.
- **kubectl/Helm:** workloads inside Managed Kubernetes, not creation of the Nebius cluster itself.
- **Slurm tools:** jobs inside an existing Soperator cluster.

Prefer Terraform for durable infrastructure. Use the CLI to inspect reality and to fill data needed by Terraform, not as an undocumented substitute for infrastructure as code.

### 4. Design the resource graph

Define dependencies in this order when applicable:

1. Tenant/project/region and ownership metadata.
2. IAM identities, groups, roles, and automation credentials.
3. Network, subnets, security boundaries, DNS, and public exposure.
4. Registry, object storage, disks, shared filesystems, and secrets.
5. Compute, Serverless AI, Kubernetes, Soperator, Applications, or Token Factory resources.
6. Workload configuration, autoscaling, health checks, logs, metrics, alerts, and lifecycle policy.

Read [authentication and resource model](reference/20-auth-and-resource-model.md) and [infrastructure workflows](reference/30-infrastructure-workflows.md).

### 5. Implement safely

- Keep secrets out of source, shell history, logs, Terraform configuration, and user-visible output.
- Use environment variables, service-account credential paths, MysteryBox, or the caller's secret manager.
- Use stable names, labels, and explicit project/region values.
- Prefer structured CLI output such as JSON and extract IDs programmatically.
- Pin provider, module, image, chart, and application versions when reproducibility matters, but verify current compatible versions first.
- For Terraform, run formatting, initialization, validation, and a reviewed plan before apply.
- Default to private networking and least privilege. Expose only required ports and require authentication for public endpoints.
- Do not run destructive commands unless the user explicitly requested deletion. Otherwise place them in a clearly separated teardown section.

### 6. Validate end to end

Validation must cover both control plane and workload:

- Resource reaches the expected state and is in the intended project and region.
- Identity can perform only the intended operations.
- Network path, DNS, TLS, and authentication work from the expected client location.
- Container, model, or job passes a minimal smoke test.
- Logs and metrics are available; alerts cover critical failure modes.
- Scaling, restart, or retry behavior is tested when relevant.
- Rollback and teardown steps are known before declaring completion.

Use [AI workload patterns](reference/40-ai-workloads.md), [security, observability, and cost](reference/50-security-observability-cost.md), and [troubleshooting](reference/60-troubleshooting.md).

### 7. Report the result

State:

- The selected Nebius service and why.
- Project, region, interface, and assumptions.
- Files changed and commands to run.
- Resources created or modified.
- Validation performed and its result.
- Remaining quota, capacity, security, cost, or cleanup considerations.

Follow the compact structures in [response patterns](reference/70-response-patterns.md).

## Operating Rules

- Never invent current GPU platforms, presets, regions, prices, quotas, capacity, model IDs, Kubernetes versions, or API fields. Query them at execution time.
- Capacity-advisor output is a timestamped signal, not a guarantee that GPU capacity will still exist at creation time.
- A Nebius project is region-specific. Keep project and region explicit in plans and outputs.
- Use service accounts with least privilege for automation and user federation for interactive work unless requirements dictate otherwise.
- Treat AI Cloud credentials and Token Factory API keys as separate credential domains.
- Do not modify Managed Kubernetes worker VMs through Compute; manage them through Managed Kubernetes node groups.
- For Serverless AI, use endpoints for interactive requests and jobs for finite background work.
- For Token Factory, discover the available model catalog at runtime and use an environment-selected model ID.
- Check quotas and capacity before provisioning GPUs; include cleanup guidance for every billable test resource.
- Preserve user-owned infrastructure. Import, reference, or isolate existing resources instead of silently replacing them.

## Quality Checklist

- [ ] The request is explicitly Nebius-related and routed to the correct service.
- [ ] Current official documentation or live discovery supports every dynamic value.
- [ ] Tenant/project/region and credential mode are explicit.
- [ ] Secrets are referenced safely and never exposed.
- [ ] Quota, capacity, network exposure, data residency, and cost are considered.
- [ ] Infrastructure is reproducible or the reason for an imperative approach is stated.
- [ ] Validation covers resource state, workload behavior, logs, and metrics.
- [ ] Rollback and teardown are included for risky or billable changes.
- [ ] No placeholder is presented as a real ID, model, preset, price, or endpoint.

## References

- [Platform overview and read order](reference/00-overview.md)
- [Request routing and service selection](reference/10-request-routing.md)
- [Authentication and resource model](reference/20-auth-and-resource-model.md)
- [Infrastructure workflows](reference/30-infrastructure-workflows.md)
- [AI workload patterns](reference/40-ai-workloads.md)
- [Security, observability, and cost](reference/50-security-observability-cost.md)
- [Troubleshooting](reference/60-troubleshooting.md)
- [Response patterns](reference/70-response-patterns.md)
- [Official source index](reference/90-official-sources.md)
