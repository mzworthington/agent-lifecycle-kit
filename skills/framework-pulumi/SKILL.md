---
name: framework-pulumi
description: >-
  Applies Pulumi ComponentResource patterns, stack-per-environment isolation,
  ESC/secrets management, CrossGuard policy packs, OIDC deploy roles, and
  CAF-aligned secure defaults for AWS, Azure, and GCP. Use in Pulumi.yaml
  projects, TypeScript/Python/Go Pulumi programs, or pulumi preview/up workflows.
kind: profile
phase: stack
triggers:
  - pulumi
  - pulumi up
  - pulumi preview
  - component resource
  - crossguard
  - pulumi esc
depends-on:
  - profile-iac
  - lang-typescript
tools:
  - read
  - write
  - shell
disable-model-invocation: false
---
# Pulumi Framework Gold Standards

Apply [profile-iac](../profile-iac/SKILL.md) strictly. Activate the matching `lang-*` skill for the program language (TypeScript default via [lang-typescript](../lang-typescript/SKILL.md), or Python/Go/Java when detected).

## 1. Project layout

```
pulumi/
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── Pulumi.prod.yaml     # separate stack config per environment
├── src/
│   ├── index.ts         # or main.py / main.go
│   ├── components/      # ComponentResource implementations
│   └── config.ts        # typed config loading
└── policy/              # CrossGuard policy packs
```

- **One stack per environment** (`dev`, `staging`, `prod`) - never share stack between envs.
- **ComponentResource** for every reusable boundary (e.g. `SecureBucket`, `WorkloadServiceAccount`, `PrivateService`).
- Program entry wires components; avoid 500-line `index` files.

## 2. Configuration and secrets

- Stack config for non-secret env settings (`pulumi config set aws:region`).
- Secrets via `pulumi config set --secret` or **Pulumi ESC** / cloud secret backends - never in source code.
- Typed config accessors with validation (Zod in TS, pydantic in Python) at program startup.
- Export only outputs downstream stacks need - treat exports as public API.

```typescript
const config = new pulumi.Config();
const environment = config.require("environment");
if (!["dev", "staging", "prod"].includes(environment)) {
  throw new Error(`Invalid environment: ${environment}`);
}
```

## 3. State and backends

- Pulumi Cloud or self-managed object-store backend with encryption and access restricted to deploy roles.
- Stack references (`StackReference`) for platform → workload dependencies - same pattern as Terraform remote state.
- Protect prod resources: `protect: true` on stateful resources (databases, KMS, log archives).

## 4. Identity and least privilege

- Deploy role via OIDC to cloud provider - no long-lived keys in CI or `Pulumi.yaml`.
- Runtime identities created in program: per-service accounts with scoped IAM/RBAC attached in the same ComponentResource.
- IAM policy documents generated from structured data - avoid string-built JSON policies.
- Separate ESC environments or stack config for plan vs apply credentials when org policy requires.

## 5. ComponentResource pattern

- Constructor registers all child resources with `super(type, name, args, opts)`.
- Inputs as interface/typed args; outputs as class properties for stack consumers.
- Default secure options inside component (encryption on, public access blocked) - opt-out requires an explicit arg; cover the exception in a component test or ADR, not a comment.

```typescript
export class SecureBucket extends pulumi.ComponentResource {
  public readonly bucket: aws.s3.BucketV2;

  constructor(name: string, args: SecureBucketArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:storage:SecureBucket", name, args, opts);
    this.bucket = new aws.s3.BucketV2(name, {
      bucket: args.bucketName,
      tags: args.tags,
    }, { parent: this });
    // ... encryption, public access block, versioning as defaults
    this.registerOutputs({ bucket: this.bucket });
  }
}
```

## 6. Policy as code (CrossGuard)

- Policy pack in `policy/` run on `pulumi preview` in CI.
- Deny by default: public storage, open security groups, unencrypted disks, wildcard IAM.
- Document `pulumi policy disable` exceptions with owner and expiry.

## 7. CI/CD

- PR pipeline: `pulumi preview` with refresh optional; post preview summary for review.
- Apply on merge to protected branch with approval gate for prod.
- Pin `@pulumi/*` and provider package versions in lockfile (`package-lock`, `poetry.lock`, etc.).

## 8. Testing

| Layer | Tool |
|-------|------|
| Unit | Jest/Vitest (TS) or pytest with Pulumi mocks / `pulumi.runtime.setMocks` |
| Policy | CrossGuard policy pack tests |
| Integration | Preview against validation account; optional integration stack in CI |
| Static | ESLint/ruff on program code + Checkov on synthesized templates if exported |

### XFN defaults

Owned by [agent-xfn](../agent-xfn/SKILL.md); prefer repo tools if present:

- **Security regression** - CrossGuard policies must fail CI when insecure defaults are introduced.
- **Load** - N/A at IaC layer; validate at deployed workload.

## Multi-language note

When the program is not TypeScript, add the matching language skill to context (`lang-python` patterns for Python Pulumi, etc.) while keeping this framework skill active for Pulumi-specific rules.
