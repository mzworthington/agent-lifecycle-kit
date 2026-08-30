# Moving Beyond Vibes: Why AI Agents Need Eval-Driven Development (EDD)

Connecting a Large Language Model to external tools—via Model Context Protocol (MCP) servers, APIs, or terminal hooks—transforms an LLM from a passive conversationalist into an active decision-maker.

However, building reliable agentic systems exposes a fundamental architectural challenge: bridging non-deterministic reasoning with deterministic code.

When an agent fails in production, it rarely fails with a clear stack trace. It fails probabilistically—hallucinating a tool parameter, choosing the wrong API endpoint, or spiraling into an infinite retry loop. Treating prompt design and tool schemas as informal configuration rather than version-controlled, tested code is no longer viable.

Enter **Eval-Driven Development (EDD)**.

## The Red-Green-Refactor Cycle for LLMs

EDD adapts classical Test-Driven Development (TDD) principles to probabilistic systems by splitting development into two distinct loops:

1. **Red (Intent Definition):** Write a failing evaluation asserting that a specific user intent triggers the correct tool with valid schema arguments.
2. **Green (Interface Implementation):** Expose the tool schema and minimal system instructions. Run the eval against a target model until assertions pass.
3. **Refactor (Context Optimization):** Iterate on tool descriptions, parameter hints, and system constraints to eliminate edge-case hallucinations and reduce token burn without breaking existing workflows.

## Core Tenets of the EDD Framework

- **Context Isolation:** Every evaluation starts with an empty context window, eliminating conversational cross-contamination.
- **Deterministic Tool Mocking:** Evals mock external API endpoints, ensuring test runs evaluate model reasoning speed and accuracy rather than third-party network latency.
- **Dual-Layer Assertions:** Strict JSON schema validation handles parameter extraction, while lightweight LLM-as-a-judge templates verify unstructured semantic responses.
- **CI/CD Quality Gates:** Automated evaluation runs act as pull-request blockers, failing builds when routing accuracy or schema compliance drops below defined thresholds.
- **Closed-Loop Telemetry:** Unhandled edge cases and production failures automatically convert into regression datasets (`.jsonl`), ensuring yesterday’s incident becomes tomorrow’s passing test.

## Try it in Agent Lifecycle Kit

```bash
kit eval run --suite evals/edd/architecture_routing.yaml --model scripted
kit eval ci --threshold-routing 95 --out out/reports
kit eval report --format md --out out/reports
```

See [SOPs/eval-driven-development.md](../SOPs/eval-driven-development.md) and [evals/edd/README.md](../evals/edd/README.md).
