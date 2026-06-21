# Request Routing and Service Selection

## Select the Workload Service

| User goal | Default Nebius path | Choose another path when |
| --- | --- | --- |
| Call a hosted open model through a familiar SDK | Token Factory public inference | The model/runtime is unsupported or full stack control is required |
| Reserve isolated model-serving capacity | Token Factory dedicated endpoint | The user must supply a custom serving container or runtime |
| Fine-tune a supported model as a managed workflow | Token Factory fine-tuning | Research needs custom frameworks, architectures, or distributed training |
| Run a user-owned HTTP container without managing a cluster | Serverless AI endpoint | Multiple coordinated services or Kubernetes primitives are required |
| Run finite training, evaluation, preprocessing, or batch inference from a container | Serverless AI job | A scheduler, cluster-wide queue, or long-lived distributed environment is required |
| Launch JupyterLab, vLLM, Open WebUI, or another supported packaged tool | Applications | The required version/configuration is unavailable in the marketplace |
| Obtain full OS, driver, disk, network, or GPU control | Compute VM or container over VM | A managed endpoint/job meets the requirements |
| Operate a multi-service container platform | Managed Kubernetes | The workload is a single endpoint/job or specifically Slurm-based |
| Run Slurm-based distributed AI/HPC workloads | Managed Soperator | Kubernetes-native scheduling is the actual requirement |
| Track experiments and manage model versions | Managed MLflow | The user already operates a compatible tracking stack elsewhere |
| Store datasets and model artifacts | Object Storage | POSIX semantics or shared low-latency file access is required |
| Share a filesystem across VMs or nodes | Shared filesystem or supported high-performance storage | Object semantics are sufficient |

## Token Factory vs Serverless AI

This is the most important distinction:

- **Token Factory:** the user calls managed model APIs. Nebius owns the serving stack. Model choice is constrained to the live catalog and supported custom/fine-tuned paths.
- **Serverless AI:** the user supplies a container image and resource requirements. Nebius owns VM provisioning and lifecycle, while the user owns the application/runtime inside the image.

Use Token Factory for the fastest route to managed inference. Use Serverless AI when the container or runtime is part of the product.

## Endpoint vs Job

Use an endpoint when the workload:

- Listens for requests.
- Needs a public or private request path.
- Must stay active or be startable/stoppable.
- Serves real-time inference, A/B tests, or an interactive API.

Use a job when the workload:

- Has a finite completion condition.
- Runs training, fine-tuning, evaluation, preprocessing, simulation, or batch inference.
- Should terminate automatically after success, failure, or timeout.

## Managed vs Self-Managed Decision

Prefer the managed option unless one of these is a hard requirement:

- Unsupported model, framework, driver, kernel, or networking stack.
- Custom scheduling or topology policy unavailable in the managed service.
- Sustained economics favor dedicated infrastructure and the team can operate it.
- Strict isolation, data path, compliance, or audit requirements demand lower-level control.
- The workload needs privileged access or host-level customization.

Document why lower-level infrastructure is necessary. Do not default to a GPU VM merely because it is familiar.

## Select the Control Interface

| Situation | Preferred interface |
| --- | --- |
| Explore a service or perform a single guided setup | Web console |
| Discover resources, inspect states, or run a small automation | Nebius CLI |
| Manage persistent multi-resource infrastructure | Terraform |
| Build application-driven cloud control | Official SDK or gRPC API |
| Operate workloads inside Kubernetes | `kubectl`, Helm, GitOps tooling |
| Submit and inspect Slurm workloads | Slurm commands and scripts |
| Call Token Factory | OpenAI-compatible SDK or documented REST API |

## Negative Routing

Do not activate this skill for:

- AWS, Azure, GCP, or another explicitly selected provider.
- Generic Kubernetes, Terraform, Docker, or model-development work with no Nebius context.
- Localhost-only execution.
- Nebius Group business history, leadership, financial results, valuation, or stock.
- Buying hardware or comparing retail products.
