# Authentication and Resource Model

## Resource Hierarchy

Nebius AI Cloud resources belong to a **project**, and projects belong to a **tenant**. Projects are region-specific. Treat tenant ID, project ID, and region as distinct values and show them explicitly in plans.

Operational implications:

- A project is the normal parent for VMs, clusters, buckets, and most workload resources.
- IAM and billing administration may live at tenant scope.
- Project region is selected at creation and should not be treated as mutable.
- Use a separate Nebius CLI profile per project so region-specific context cannot bleed across environments.

## Identity Choices

### Interactive user

Use federation/browser authentication for human-operated console and CLI sessions. This is appropriate for discovery, development, and one-off administration.

### Service account

Use a service account for Terraform, CI/CD, scheduled automation, and non-interactive code. Grant access through groups and roles at the narrowest useful scope.

Guidelines:

- Prefer editor-equivalent permissions for resource management.
- Grant administrative permissions only when the automation must manage IAM or other privileged control-plane resources.
- Use separate service accounts by environment or automation boundary.
- Rotate keys and remove unused accounts.

### Token Factory API key

Token Factory API keys are separate from Nebius AI Cloud CLI and Terraform credentials. Keep them in `NEBIUS_API_KEY` or the caller's secret store. Never assume an AI Cloud profile authenticates Token Factory requests.

## CLI Context

Stable discovery patterns:

```bash
nebius version
nebius profile list
nebius --help
nebius <service> --help
nebius <service> <resource> list --format json
```

Use the current CLI reference to determine exact service and resource command paths. Prefer `--format json` for automation and avoid scraping human-readable tables.

Before a change, record:

- Active profile.
- Parent project ID.
- Region implied by that project.
- Auth mode: user or service account.
- CLI version.

## Terraform Authentication

Use the official `nebius/nebius` provider and verify the current compatible version. For automation, configure the provider with service-account identifiers and a private-key file path or environment-variable indirection.

Rules:

- Do not place private-key material in `.tf` files.
- Do not commit generated credential files.
- Inspect Terraform state for sensitive values and secure the backend.
- Separate state by environment and ownership boundary.
- Use data sources for existing resources rather than duplicating them.
- Run `terraform fmt`, `terraform init`, `terraform validate`, and `terraform plan` before apply.

## Secret Handling

Preferred order:

1. Nebius MysteryBox when the workload and service integration support it.
2. Existing CI/CD or runtime secret manager.
3. Environment variables injected at execution time.
4. Local credential file referenced by path with restrictive permissions.

Never:

- Echo a secret or private key.
- Put secrets into command-line arguments when a safer mechanism exists.
- Store credentials in cloud-init, Terraform variables, notebooks, logs, or container images.
- Return MysteryBox payloads in user-visible output.

## Preflight Identity Checklist

- Correct tenant and project selected.
- Separate profile exists for the project.
- Caller can list or read intended resources.
- Service account belongs to the required group.
- No broader role is granted than necessary.
- Token Factory key is present only for Token Factory work.
- Secret paths and environment-variable names are documented without values.
