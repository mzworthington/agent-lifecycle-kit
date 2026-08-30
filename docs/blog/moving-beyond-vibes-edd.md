# Moving Beyond Vibes: Why AI Agents Need Eval-Driven Development

Connecting a Large Language Model to MCP servers, APIs, or terminals turns a chatbot into a decision-maker. Bridging non-deterministic reasoning with deterministic code is the hard part.

When an agent fails in production, it rarely fails with a stack trace. It fails probabilistically—wrong tool, hallucinated parameter, infinite retry. Treating prompts and tool schemas as informal config is no longer viable.

**Eval-Driven Development (EDD)** is the sensible default: the same red → green → refactor discipline as TDD, applied to agent tool use.

## Red → green → refactor for agents

1. **Red** — Write a failing eval that asserts a user intent triggers the correct tool with valid arguments.
2. **Green** — Expose the tool schema and minimal system instructions; run until asserts pass.
3. **Refactor** — Iterate descriptions and constraints to kill edge-case hallucinations and token burn without breaking existing cases.

## What you need in practice

- **Context isolation** — Fresh context per case
- **Deterministic tool mocks** — Measure routing, not network luck
- **Dual-layer asserts** — Schema match + optional LLM-as-a-judge
- **CI gates** — Block merges when routing accuracy drops
- **Closed-loop telemetry** — Production misses become tomorrow’s JSONL cases

## Try it in Kit

```bash
kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
kit eval ci --threshold-routing 95 --out out/reports
kit eval report --format md --out out/reports
```

Guide: [docs/edd.md](../edd.md) · Procedure: [SOPs/eval-driven-development.md](../../SOPs/eval-driven-development.md) · Suites: [evals/edd/README.md](../../evals/edd/README.md)
