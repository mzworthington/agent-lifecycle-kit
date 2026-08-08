---
title: Cloudflare observability and diagnosis
kind: sop
triggers:
  - Cloudflare
  - Workers
  - Pages
  - Wrangler
  - Workers Logs
  - Logpush
  - observability
  - diagnosis
  - production incident
  - live site
  - SLO
  - OpenTelemetry
  - OTel
tools:
  - shell
  - read
  - grep
  - browser
---
# Standard Operating Procedure: Cloudflare Observability & Diagnosis

Cloudflare is the **principal hosting surface** for kit consumers that deploy Workers, Pages, Durable Objects, KV, R2, D1, Queues, and related bindings. This SOP is the operational playbook for making those systems observable and for diagnosing live failures on Cloudflare.

**Do not vendor** Cloudflare platform how-tos into `skills/`. Prefer official skills from [external.lock.json](../skills/external.lock.json) ([SOPs/external-skills.md](./external-skills.md)) and the [Cloudflare MCP](../mcps/servers/cloudflare/README.md).

## Ownership

| Concern | Owner | When |
|---------|-------|------|
| Instrumentation, SLO → metric/alert mapping, export | [agent-telemetry](../skills/agent-telemetry/SKILL.md) | Feature lifecycle **telemetry** phase; new adapters on Cloudflare |
| Live symptom RCA (errors, latency, empty responses, deploy regressions) | [agent-debug](../skills/agent-debug/SKILL.md) + [hypothesis-driven-debug](./hypothesis-driven-debug.md) | Bug / incident / “Failed to fetch” / prod-only failure |
| Account / DNS / Worker / R2 lookups while wiring | [agent-adapter](../skills/agent-adapter/SKILL.md) + Cloudflare MCP `cloud` profile | Impl / adapter work |
| Platform API / Wrangler conventions | Upstream `cloudflare`, `wrangler`, `workers-best-practices` skills | After `./scripts/sync-external-skills.sh --install` |

Generic debug rules still apply: evidence before edits, ≤5 hypotheses, prove the fix. This SOP adds the **Cloudflare signal ladder** and baseline config.

## Location guidance (kit vs elsewhere)

| Put it here (this SOP / kit) | Put it elsewhere |
|------------------------------|------------------|
| Hosting-agnostic lifecycle hooks (telemetry + debug) | **App repo** `docs/runbooks/` — account IDs, dashboard deep-links, alert channels, service inventory |
| Cloudflare-shaped checklists agents reuse across projects | **App repo** ADRs — durable choices (OTLP vendor, sampling rates, Logpush destinations) |
| Links to MCP + external skills | **`skills/framework-*`** — only if a specific framework (e.g. Next on Pages) needs code conventions beyond this SOP |
| | **`profile-cloudflare`** — only if CAF/least-privilege *policy* for CF resources grows large enough to merit a domain profile (start here first) |
| | **Upstream `cloudflare/skills`** — product UI / API details that change often; do not copy into kit git |

## 1. Observability baseline (telemetry phase)

For every Worker (or Pages Function) that serves production traffic:

### 1.1 Enable Workers Observability

In `wrangler.toml` / `wrangler.jsonc`, ensure logs (and traces when ready) are on. Prefer explicit config over relying on dashboard defaults:

```jsonc
{
  "observability": {
    "enabled": true,
    "logs": {
      "enabled": true,
      // Sample high-traffic Workers; keep 1.0 until volume/cost forces otherwise
      "head_sampling_rate": 1
    },
    "traces": {
      "enabled": true,
      "head_sampling_rate": 1
    }
  }
}
```

Redeploy after changing observability config. Confirm events appear under **Workers → Observability** for that script.

Official docs: [Workers Observability](https://developers.cloudflare.com/workers/observability/), [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [Traces](https://developers.cloudflare.com/workers/observability/traces/).

### 1.2 Structured application logs

Align with [agent-telemetry](../skills/agent-telemetry/SKILL.md):

- Prefer structured JSON fields (level, `correlationId` / `requestId`, route/use-case, outcome).
- No PII, tokens, cookies, or secrets in `console.*` or exported logs.
- Propagate inbound correlation IDs across `fetch`, Queue consumers, and Durable Object calls when the app owns the protocol.
- Treat Cloudflare invocation metadata (`$cloudflare.$metadata.type = "cf-worker-event"` and related fields) as **infrastructure context**, not a substitute for application outcome logs.

### 1.3 Metrics & SLOs from XFN

Map each **apply** load/performance row from `handover_xfn.md` to a Cloudflare-visible signal:

| XFN SLO example | Cloudflare signal | Alert idea |
|-----------------|-------------------|------------|
| p95 latency under N ms | Worker wall time / request duration percentiles | Burn on sustained p95 breach |
| Error rate under X% | 5xx + uncaught exception rate per Worker | Page on error-rate spike vs baseline |
| Availability | Success ratio / zone analytics | Multi-window burn rate |
| Binding I/O budget | KV / R2 / D1 / DO latency & error views | Per-binding saturation |

Record the mapping in `handover_telemetry.md` (SLO → dashboard query / alert name, or **N/A** if load was skipped).

Built-in Worker metrics (requests, errors, CPU time, wall time) are the default. Custom app metrics: emit via Analytics Engine or your OTLP vendor when product needs dimensions Cloudflare does not provide. Note: **OTLP metrics export from Workers is not always available** — verify current docs before promising it; use dashboard metrics + Logpush/OTLP logs/traces as the fallback.

### 1.4 Export strategy (optional but preferred at scale)

Choose one primary long-retention path; document it in the app repo:

| Path | Use when |
|------|----------|
| **Workers Observability dashboard** | Small surface; 3–7 day retention is enough |
| **OTLP export** (Honeycomb, Grafana, Axiom, Sentry, …) | Existing observability stack; correlated traces + logs |
| **Workers Logpush** (R2 / S3 / provider) | Compliance, SIEM, long retention of invocation/trace events |
| **Tail Workers** | Custom fan-out / enrichment pipeline |

OTLP export docs: [Exporting OpenTelemetry data](https://developers.cloudflare.com/workers/observability/exporting-opentelemetry-data/).

Secrets for OTLP endpoints stay in Wrangler secrets / CI — never in kit git.

### 1.5 Telemetry Definition of Done (Cloudflare)

- [ ] `observability` enabled in Wrangler for production Workers; redeployed
- [ ] XFN load SLOs mapped to Worker metrics/alerts (or N/A)
- [ ] Structured logs + correlation IDs at adapter boundaries
- [ ] Export/Logpush choice recorded (dashboard-only is explicit, not accidental)
- [ ] Sampling rates justified for high-traffic Workers
- [ ] Handover lists dashboard path or OTLP destination for on-call

## 2. Diagnosis ladder (debug phase)

Use [hypothesis-driven-debug](./hypothesis-driven-debug.md) first. Add this triage class when the symptom is on Cloudflare-hosted traffic:

| Class | Cheap first experiment |
|-------|------------------------|
| **Cloudflare edge / Worker** | Confirm hostname → correct Worker/Pages deployment; compare last successful deploy version |

### 2.1 Signal ladder (cheapest → deepest)

```text
1. Deploy / version parity     → right script, right env, recent ship?
2. Zone / DNS / routes         → hostname, custom domain, route patterns
3. Real-time logs              → wrangler tail / dashboard real-time
4. Workers Logs + query        → filter by status, outcome, correlationId
5. Traces                      → binding spans (KV, R2, DO, fetch)
6. Metrics window              → error rate / latency vs deploy marker
7. Logpush / OTLP archive      → beyond dashboard retention
8. Local repro                 → wrangler dev + fixture; then product fix
```

Do not jump to product deep-dives while deploy/DNS/version mismatch still fits.

### 2.2 Intake extras (Cloudflare)

Add to the debug board ([templates/debug-board.md](../templates/debug-board.md)):

| Field | Example |
|-------|---------|
| Hostname / route | `api.example.com/v1/...` |
| Worker / Pages project | script name, env (`production` / `staging`) |
| Deployment ID / version | Wrangler/CI output or dashboard Versions |
| Cloudflare ray ID | From error page or `cf-ray` response header |
| Binding touched | KV namespace, R2 bucket, DO name, D1 DB |
| Recent ship? | CI deploy run URL, `wrangler versions` |

### 2.3 Common symptom → first probe

| Symptom | First probe |
|---------|-------------|
| 1042 / Worker threw exception | Real-time logs for exception message + stack; last deploy diff |
| 1101 / Worker exceeded limits | CPU/wall time metrics; loop or large payload hypothesis |
| 5xx from origin-like path | Confirm request hit Worker vs origin; check route order |
| Empty / stale content (Pages) | Deployment status; cache/purge; asset hash vs expected build |
| Binding failures (KV/R2/D1/DO) | Trace/log for binding error; binding name in Wrangler vs code |
| Intermittent latency | Metrics by colo/time; sampling; DO single-thread hotspots |
| Auth / CORS only in prod | Single failing URL + response headers; env secret presence |
| “Works locally, fails deployed” | Env vars/secrets parity; compatibility date; nodejs_compat flags |

### 2.4 Tooling map

| Need | Tool |
|------|------|
| Live log stream | `npx wrangler tail` (or project-local Wrangler) for the target Worker/env |
| Account resource lookup | Cloudflare MCP (`mcps/profiles/cloud.json`) — OAuth; least privilege |
| Platform conventions | Upstream skills: `cloudflare`, `wrangler`, `workers-best-practices` |
| Prior agent RCA | `cursor-cloud` MCP → `list-cloud-agents` / `batch-fetch-details` |
| CI deploy failure | `scripts/debug-ci-failed.sh` then Wrangler deploy logs |
| Visual / client bug | Browser / computerUse **and** confirm edge status/ray ID |

### 2.5 Proof gates (Cloudflare)

| Claim | Proof |
|-------|-------|
| “Deploy fixed it” | New version ID serving; before/after error-rate or repro path |
| “Config/secret fixed it” | Missing key demonstrated; prod request succeeds after set |
| “Code fixed it” | Regression test + successful deploy + same repro path green |
| “Only cache” | Cache-bypass / purge evidence; no Worker exception in logs |

State deploy/version status in the user summary without waiting to be asked.

## 3. Security & hygiene

- Log sanitation — same as telemetry skill; scrub Authorization and cookie headers in any custom Tail Worker.
- Prefer **read-only** Cloudflare MCP scopes during diagnosis; mutate (purge, secret put, deploy) only with clear user intent.
- Do not paste full `wrangler secret` values or OTLP keys into handovers or PRs.
- Sampling and retention must respect project data-retention / GDPR constraints (document in app runbook).

## 4. Orchestration routes

| Request | Route |
|---------|-------|
| Add metrics/logs/alerts for a Cloudflare-hosted feature | `agent-telemetry` → this SOP §1 |
| Prod error / latency / empty response on CF hostname | `agent-debug` → [hypothesis-driven-debug](./hypothesis-driven-debug.md) → this SOP §2 |
| New Worker/Pages adapter wiring | `agent-adapter` + Cloudflare MCP + upstream Wrangler skills |
| Hosting decision (vendor, OTLP destination, Logpush) hard to reverse | `agent-adr` → app `docs/ADRs/` |
| Platform skill missing / outdated | [external-skills](./external-skills.md) sync — do not vendor |

## 5. Handover & lessons

- Telemetry: `handover_telemetry.md` — include Cloudflare signal mapping and export choice.
- Debug: `handover_debug.md` — include ray ID, Worker version, and which ladder step confirmed RCA.
- Recurring CF friction → local lesson under `~/.agents/lessons/<project>/`; promote via [tasks/kit-review.md](../tasks/kit-review.md).
