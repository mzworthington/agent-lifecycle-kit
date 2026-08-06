---
name: framework-terraform
description: >-
  Applies Terraform module layout, remote state with locking, OIDC CI apply,
  least-privilege IAM, Checkov/tfsec gates, and CAF-aligned landing-zone patterns
  for AWS, Azure, and GCP. Use in Terraform repos, .tf modules, Terragrunt, or
  when the user mentions terraform plan/apply.
kind: profile
phase: stack
triggers:
  - terraform
  - terragrunt
  - tf plan
  - tf apply
  - remote state
  - terraform module
depends-on:
  - profile-iac
  - lang-hcl
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Terraform Framework Gold Standards

Apply [profile-iac](../profile-iac/SKILL.md) and [lang-hcl](../lang-hcl/SKILL.md) strictly. Use [agent-security](../agent-security/SKILL.md) mindset on IAM and network exposure.

## 1. Repository layout

```
infra/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── prod/          # separate backend key / workspace per env
├── modules/
│   ├── networking/
│   ├── iam/
│   └── <workload>/
└── policies/          # Checkov suppressions (documented) or Sentinel/OPA
```

- **Root modules** in `environments/<env>` wire modules and set backend + providers.
- **Child modules** are reusable; no environment-specific logic inside shared modules — pass via variables.
- **Terragrunt** - Use for DRY backend/provider config; keep leaf modules Terraform-pure.

## 2. State and backends

- Remote backend only (S3 + DynamoDB, GCS + locking, Azure Storage + blob lock).
- Encrypt state at rest; block public access on state buckets.
- One state per blast-radius boundary — never one monolithic state for entire org.
- `terraform_remote_state` or stack outputs for cross-stack references — no duplicated resource definitions.

## 3. CI/CD and identity

- CI runs: `fmt -check`, `validate`, static analysis, `plan` — post plan artifact for review.
- Apply uses **OIDC federation** to cloud IAM (GitHub Actions, GitLab, Azure DevOps) — no static cloud keys in CI.
- Separate pipeline roles: **plan** (read + plan) vs **apply** (write) with narrower apply role per environment.
- Prod apply from protected branch with mandatory human approval on plan diff.

## 4. IAM and least privilege (Terraform-specific)

- One IAM role per workload/service — no shared `PowerUser` attachments.
- Use `aws_iam_role` + `aws_iam_role_policy` / inline policy documents with scoped ARNs.
- Attach **permission boundaries** on human or broad roles where org requires.
- For AWS: prefer IRSA / OIDC trust policies over instance profiles when on Kubernetes/ECS.
- For Azure: user-assigned managed identities per app; RBAC at resource group or resource scope.
- For GCP: service accounts per workload; no project-level `roles/editor` for runtime.

## 5. Network and data defaults

- Private subnets for compute; public subnets only for ingress load balancers or NAT as designed.
- Security groups / NSGs / firewall rules: default deny ingress; document every `0.0.0.0/0` exception.
- S3/GCS/Azure storage: block public access, encryption enabled, versioning on stateful buckets.
- RDS / managed DB: not publicly accessible, encrypted, backup retention set, deletion protection in prod.

## 6. Modules

- Semantic versioning for internal modules (`modules/networking?ref=v1.2.0`).
- README per module: inputs, outputs, example, required IAM permissions.
- No `terraform apply` from inside module directories in CI — only from environment roots.

## 7. Policy as code

- **Checkov** or **tfsec** in CI — fail on CRITICAL/HIGH unless `checkov:skip` / exception with ticket ID in comment.
- Optional: **Sentinel** (Terraform Cloud) or **OPA** for org-wide guardrails (region allow-list, tag enforcement).
- Rego/ Sentinel policies for: required tags, no `AdministratorAccess`, no unencrypted volumes.

## 8. Testing

| Layer | Tool |
|-------|------|
| Format / validate | `terraform fmt -check`, `terraform validate` |
| Static security | Checkov, tfsec, or Trivy config scan |
| Unit | `terraform test` with mock providers or fixture modules |
| Integration | Plan against validation account; optional Terratest for critical modules |
| Drift | Scheduled `terraform plan -detailed-exitcode` in CI |

### XFN defaults

Owned by [agent-xfn](../agent-xfn/SKILL.md); prefer repo tools if present:

- **Security regression** - Policy-as-code tests must fail when public exposure or wildcard IAM is introduced.
- **Load** - N/A for most IaC; apply load tests at workload layer after deploy.
