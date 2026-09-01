---
name: lang-hcl
description: >-
  Enforces HCL and Terraform expression conventions: validation blocks, sensitive
  marking, provider pinning, readable module interfaces, and fmt/lint discipline.
  Use when writing or reviewing .tf, .tfvars, or Terraform module HCL.
kind: profile
phase: stack
triggers:
  - hcl
  - terraform hcl
  - .tf
  - tfvars
  - terraform expression
depends-on:
  - profile-iac
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# HCL / Terraform Expression Standards

Apply when authoring HCL for Terraform. Platform security and CAF rules come from [profile-iac](../profile-iac/SKILL.md). Delivery patterns from [framework-terraform](../framework-terraform/SKILL.md).

## Style and structure

- Run `terraform fmt` - committed code is formatted.
- One resource or logical group per file when modules grow large (`iam.tf`, `network.tf`).
- Use `locals` for derived values; avoid repeating expressions.
- Prefer `for_each` over `count` when resource identity matters.
- Use `dynamic` blocks only when the alternative duplicates many near-identical resources.

## Variables and outputs

- Every input variable has `description` and `type`.
- Use `validation` blocks for enums, regex, and numeric bounds - fail at plan, not runtime.
- Mark sensitive values: `sensitive = true` on variables and outputs that carry secrets or tokens.
- Outputs are minimal - expose only what downstream modules or remote state consumers need.
- No default secrets. Defaults for secrets must be `null` and supplied via env or secret store.

```hcl
variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}
```

## Providers and versions

- `terraform` block pins `required_version` and every `required_providers` entry.
- Commit `.terraform.lock.hcl` - do not delete on upgrade without intentional provider bump PR.
- Configure providers in root; pass aliased providers into modules explicitly when multi-region/account.

## Security in HCL

- No hardcoded API keys, passwords, or private keys in `.tf` / `.tfvars` committed to git.
- Use `aws_iam_policy_document` / cloud equivalents to build least-privilege JSON - avoid hand-written policy JSON strings.
- Prefer `lifecycle { prevent_destroy = true }` on prod stateful resources (KMS, RDS, log buckets).
- `ignore_changes` only with comment explaining drift source (e.g. autoscaling tags).

## Expressions

- Use explicit comparisons; avoid clever one-liners that obscure intent.
- Handle `null` and empty collections safely - no unguarded `tolist` on optional attributes.
- Document non-obvious `depends_on` when implicit graph edges are insufficient.

## Testing defaults

| Layer | Default |
|-------|---------|
| Format / validate | `terraform fmt -check`, `terraform validate` |
| Static security | tfsec or Checkov on module root |
| Unit | `terraform test` (native tests) or Terratest when Go harness exists |
| Plan gate | `terraform plan` with locked providers in CI |
