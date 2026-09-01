---
name: profile-iac
description: >-
  Applies secure infrastructure-as-code practices, principle of least privilege,
  policy-as-code guardrails, and Cloud Adoption Framework (CAF) alignment for
  cloud landing zones and workload provisioning. Use when writing or reviewing
  Terraform, Pulumi, CloudFormation, Bicep, or other IaC for AWS, Azure, or GCP.
kind: profile
phase: stack
triggers:
  - infrastructure as code
  - iac
  - landing zone
  - cloud provisioning
  - least privilege
  - policy as code
  - caf
  - well-architected
depends-on: []
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Infrastructure as Code - Secure Foundations

Apply these rules for **all** IaC tools and clouds. Stack-specific delivery lives in [framework-terraform](../framework-terraform/SKILL.md) or [framework-pulumi](../framework-pulumi/SKILL.md).

## Cloud Adoption Framework alignment

Map every change to CAF phases (Azure CAF, AWS CAF, or Google CAF - same pillars):

| Phase | IaC mandate |
|-------|-------------|
| **Strategy** | Tag for cost center, environment, data classification, and owner. No orphan resources without business context. |
| **Ready** | Landing-zone primitives first (identity, network, logging, backup). Workload modules consume shared platform outputs - do not re-create platform guardrails per app. |
| **Adopt** | All durable infra via IaC and CI pipelines. No console-only production changes; drift is detected and remediated. |
| **Govern** | Policy-as-code in CI (deny public exposure, require encryption, block `*` admin). Prod apply requires review gate. |
| **Manage** | Observability, backup, and patch hooks provisioned with the resource - not bolted on later. |

Align with **Well-Architected** pillars: security and reliability first; operational excellence via automation; cost and performance via right-sizing and autoscaling defaults.

## Principle of least privilege

- **Identity** - Workload identities (OIDC federated roles, managed identities, workload service accounts). No long-lived access keys in IaC or state.
- **IAM policies** - Explicit `Allow` on required actions only. Prefer resource-scoped ARNs, prefix conditions, and ABAC tags. Avoid `Action: "*"` and `Resource: "*"` except in break-glass roles with extra conditions and audit.
- **Separation** - Distinct roles per environment, per workload, and per pipeline stage (plan vs apply). Break-glass is rare, monitored, and time-bound.
- **Network** - Default deny. No `0.0.0.0/0` ingress on admin ports. Public endpoints only behind WAF/CDN with explicit rationale in comments or ADR.
- **Data** - Encryption at rest (CMK/customer-managed keys when compliance requires). TLS for all service-to-service traffic. Block public data stores.

## Secure IaC hygiene

- **Secrets** - Never in VCS, plain config, or unencrypted state. Use vault, Secret Manager, Pulumi secrets, or Terraform ephemeral/variable-from-env patterns.
- **State** - Remote backend with encryption, versioning, and locking. Restrict state bucket/object IAM to pipeline roles only.
- **Supply chain** - Pin provider and module versions. Review third-party modules; prefer internal modules for security-sensitive paths.
- **Static analysis** - Run in CI before merge: Checkov, tfsec, Trivy, Terrascan, or Pulumi CrossGuard. Fail on high/critical unless documented exception.
- **Plan discipline** - `validate` + `plan` (or preview) on every PR. Prod apply only from protected branch after approval.
- **Destroy safety** - `prevent_destroy` or equivalent on stateful prod resources. Deletion protection on databases, KMS keys, and log archives.

## Module and environment design

- **Composable modules** - Small modules with clear inputs/outputs. One concern per module (e.g. `vpc-subnet`, `kms-key`, `service-account`).
- **Environment isolation** - Separate state files or stacks per environment. No shared state between dev and prod.
- **Blast radius** - Split state by domain (network, data, compute) when teams or blast-radius boundaries warrant it.
- **Outputs as contracts** - Platform teams publish outputs; workload teams consume via remote state or stack references - not copy-paste.

## Testing defaults

Prefer project-existing tools; otherwise these defaults for [agent-tdd](../agent-tdd/SKILL.md) / [agent-xfn](../agent-xfn/SKILL.md):

| Layer | Default |
|-------|---------|
| Static / policy | Checkov or tfsec (Terraform); CrossGuard (Pulumi); OPA/Sentinel if already in org |
| Unit | Policy tests on fixture modules (e.g. `terraform test`, custom policy harness) |
| Integration | Plan/preview in CI against ephemeral or dedicated validation account |
| Security regression | Policy-as-code must fail on: public S3/GCS bucket, open SG, unencrypted storage, wildcard IAM |
| Drift | Scheduled plan or drift detection job in CI/CD |

## Audit checklist (before merge)

1. No secrets or credentials in code, vars files committed, or state.
2. IAM scoped to minimum actions and resources.
3. Encryption and logging enabled by default.
4. Public access blocked or explicitly justified.
5. Tags present for environment, owner, and data classification.
6. Provider/module versions pinned.
7. Static analysis passing or exceptions recorded in handover/ADR.
