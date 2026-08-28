# Hybrid Skill Evaluation Framework (`evals/`)

This directory and the co-located skill eval folders contain evaluation suites and benchmark contracts for `agent-lifecycle-kit` (`.agents`).

The kit uses a **Hybrid Evals Architecture**:
1. **Co-Located Unit Evals (`skills/<skill-name>/evals/eval.json`):** Single-skill output assertions co-located next to `SKILL.md` for portability and tight developer feedback.
2. **Centralized System & Routing Evals (`evals/suites/*.json`):** Cross-skill routing matrix tests (`routing-matrix.json`), multi-phase role benchmarks (`lifecycle-roles.json`), and stack profile benchmarks (`stack-profiles.json`).

Evals ensure that:
- **Routing & Trigger Accuracy:** Prompts activate the correct specialist role (`agent-*`) or stack profile (`lang-*`, `framework-*`).
- **Guardrail Conformance:** Generated agent outputs adhere to architectural principles ([CODING_PHILOSOPHY.md](../CODING_PHILOSOPHY.md)), output schemas, and lifecycle SOPs.
- **No Drift:** Skill updates do not introduce prompt regressions or weaken behavioral guardrails.

---

## Directory Structure

```text
.
├── evals/
│   ├── README.md                  # Hybrid architecture overview
│   ├── schema.json                # JSON Schema for validation
│   └── suites/
│       ├── lifecycle-roles.json   # Kit-wide test cases for agent-* specialist roles
│       ├── stack-profiles.json    # Kit-wide test cases for lang-* and framework-* profiles
│       └── routing-matrix.json    # Cross-role routing classification accuracy tests
└── skills/
    ├── agent-spec/
    │   ├── SKILL.md
    │   └── evals/
    │       └── eval.json          # Co-located unit eval benchmark
    ├── agent-tdd/
    │   ├── SKILL.md
    │   └── evals/
    │       └── eval.json          # Co-located unit eval benchmark
    ...
```

---

## Test Case Structure

Every eval test case is defined in JSON adhering to `evals/schema.json`:

```json
{
  "suite": "agent-spec-co-located",
  "description": "Co-located evaluation benchmark for agent-spec BDD specification skill",
  "version": "1.0.0",
  "test_cases": [
    {
      "id": "EVAL-SPEC-001",
      "name": "BDD Requirement Specification",
      "description": "Verifies feature requests generate Gherkin scenarios with ubiquitous language without implementation code.",
      "target_skill": "agent-spec",
      "prompt": "Create acceptance criteria for adding multi-tenant workspace sharing.",
      "context": {
        "active_phase": "spec"
      },
      "assertions": {
        "required_triggers": ["acceptance criteria", "specification"],
        "required_patterns": ["Scenario:", "Given ", "When ", "Then "],
        "forbidden_patterns": ["```typescript", "import {", "ASCII art"],
        "required_output_sections": ["Bounded Contexts", "Gherkin Acceptance Scenarios", "Cross-Functional Criteria"]
      }
    }
  ]
}
```

---

## Running Validation

Validate schema compliance, syntax, and skill reference integrity across both centralized suites and co-located skill evals:

```bash
./scripts/validate-evals.sh
```

Ensure skill folder layout rules remain valid:

```bash
./scripts/verify-skills-layout.sh
```
