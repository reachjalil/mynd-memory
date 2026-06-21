# Infrastructure Workflows

## Universal Preflight

Before provisioning:

1. Resolve tenant, project, and region.
2. Check relevant quotas.
3. For GPUs, query the capacity advisor and record its timestamp.
4. Confirm network and storage dependencies.
5. Decide whether the resource is ephemeral, persistent, or shared.
6. Choose CLI for discovery and Terraform for durable infrastructure.
7. Define naming, labels, owner, environment, and teardown policy.

Do not infer availability from a marketing page or an old example. Capacity and default quotas can change independently by region and tenant age.

## Network-First Design

Define:

- VPC/network and subnets.
- Private vs public address requirements.
- Allowed ingress and egress.
- DNS and TLS ownership.
- Load balancing or endpoint exposure.
- Access path for operators, CI, and workload dependencies.

Default to private resources. A public IP or public endpoint should have a concrete consumer, authentication, minimal ports, and a removal plan.

## Compute VM Pattern

Use Compute when the user needs host-level control.

Plan:

- Current platform and preset discovered from live references.
- Boot and data storage types and sizes.
- GPU, InfiniBand, reservation, or preemptible requirements.
- Image, cloud-init, user access, and driver/runtime strategy.
- VPC, security groups, public access, and DNS.
- Monitoring, maintenance behavior, backup, and deletion policy.

Validate from both control plane and guest:

- VM running in correct project/region.
- Expected CPU/GPU/storage visible.
- Network path works only as intended.
- Runtime and workload smoke test succeeds.
- Logs and metrics are emitted.

## Object and File Storage

Choose by access semantics:

- **Object Storage:** datasets, checkpoints, artifacts, logs, backups, and S3-compatible tooling.
- **Disk:** block storage attached to one VM at a time.
- **Shared filesystem:** POSIX-style access shared across multiple VMs or nodes.
- **Supported high-performance storage:** distributed training or high-throughput data paths when ordinary storage is insufficient.

Verify current endpoint, region behavior, credentials, lifecycle/versioning, encryption, and egress implications. Avoid embedding access keys in scripts.

## Container Registry

For containerized workloads:

1. Create or reuse a registry/repository.
2. Authenticate the builder without exposing credentials.
3. Build a deterministic image and tag it with an immutable identifier.
4. Push and verify the digest.
5. Grant runtime pull access.
6. Reference the digest for production where possible.
7. Configure retention and remove stale images.

## Managed Kubernetes Pattern

Use Managed Kubernetes for a container platform, not merely to run one container.

Plan separately:

- Control plane version and lifecycle.
- CPU system node group and GPU workload node groups.
- Autoscaling boundaries.
- GPU/InfiniBand setup and topology requirements.
- CNI/network policies, ingress, DNS, certificates, and load balancing.
- Storage classes and persistent volumes.
- Registry access and workload identity.
- Logging, metrics, alerts, maintenance, and upgrades.

Rules:

- Manage nodes through Managed Kubernetes node groups, never through Compute.
- For GPU autoscaling, retain CPU capacity for cluster services so GPU groups can scale down.
- Keep cluster and node versions compatible.
- Use taints, tolerations, labels, requests, and limits deliberately.
- Test scheduling and failure recovery, not just pod creation.

## Managed Soperator Pattern

Use Managed Soperator for Slurm-based distributed workloads.

Plan:

- Login, worker, and service nodes.
- Capacity reservation/block requirements.
- Shared storage and dataset transfer.
- User and file-access model.
- Partition, queue, topology, and job requirements.
- Health checks, NCCL validation, monitoring, and drained-node behavior.
- Stop/start vs delete lifecycle and data persistence implications.

A deletion can permanently remove node and attached-volume data. Separate durable datasets/checkpoints from cluster-local storage before teardown.

## Terraform Delivery Pattern

A production-ready Terraform change should include:

- `terraform` block and current supported provider constraint.
- Provider authentication by profile or service-account indirection.
- Variables with descriptions and validation.
- Data sources for shared/existing resources.
- Resources with explicit parent IDs and ownership labels.
- Outputs that expose non-secret IDs and endpoints.
- Remote-state strategy where appropriate.
- README or runbook with init/plan/apply/destroy commands.

Validation sequence:

```bash
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -out=tfplan
```

Do not apply unless the task authorizes a real change and credentials are available. Never imply that a plan guarantees GPU capacity at apply time.
