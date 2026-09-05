---
# MADR-inspired (simplified). Copy to docs/ADRs/NNNN-short-title.md
status: Accepted # Proposed | Accepted | Deprecated | Superseded by ADR-NNNN
date: YYYY-MM-DD
deciders: []
---

# NNNN. Short title of problem and solution

## Context and Problem Statement

2–4 sentences: what forces the decision, and the question we must answer.

## Decision Drivers

* Driver 1 (e.g. reversibility, boundary clarity, operability)
* Driver 2
* Driver 3

## Considered Options

* Option A: …
* Option B: …
* Option C: … (include status quo when relevant)

## Decision Outcome

Chosen option: "**Option A**", because …

### Consequences

* Good, because …
* Bad, because …
* Follow-up: … (optional)

## Architecture sketch

One **Mermaid** diagram of the **chosen** shape (ports/adapters, slice boundary, or request flow). Replace the example. Do not use ASCII/box-drawing diagrams in ADRs (TTY CLI chrome is a different surface).

```mermaid
flowchart LR
  UI[Driving adapter] --> PortIn[Inbound port]
  PortIn --> Domain[Domain / use case]
  Domain --> PortOut[Outbound port]
  PortOut --> Infra[Driven adapter]
```

## Links

* Related ADRs: …
* Spec / issue: …
* Arch norms: hexagonal, DDD, vertical slices ([CODING_PHILOSOPHY](../../CODING_PHILOSOPHY.md) via kit)
