# Feature lifecycle

When the job is a product feature, Waykit routes work through specialist roles: grilling, PRD/bet (when the value is unproven), stories, spec, TDD, cross-functional quality, audit, telemetry, and release — then confirm or kill flagged bets. Language and framework profiles load on top of that once the stack is known. EDD (**alpha**) is how you prove tool routing in CI; it lives inside TDD when the change is a prompt or a tool schema. Product bets: [hypothesis-driven development](/SOPs/hypothesis-driven-development). Bugs: [hypothesis-driven debug](/SOPs/hypothesis-driven-debug).

```mermaid
sequenceDiagram
  autonumber
  participant O as orchestrator
  participant G as grilling
  participant P as prd
  participant U as stories
  participant S as spec
  participant T as tdd
  participant X as xfn
  participant Sec as security
  participant Arch as arch-drift
  participant Tel as telemetry
  participant R as release

  O->>G: Stress-test idea; contract vs bet
  opt Bet
    O->>P: Belief, indicator, kill criteria, flag plan
  end
  O->>U: INVEST stories (hypothesis + flag notes)
  O->>S: Gherkin (flag off / on / kill when flagged)
  O->>T: Inventory catalog and plan test impact
  O->>X: Cross-functional quality matrix
  O->>T: TDD short loop (gear 1 + gear 2)
  O->>X: Green apply-row XFN suites
  O->>Sec: Security and OWASP audit
  O->>Arch: Hexagonal boundaries, no drift
  O->>Tel: SLOs plus leading indicator
  O->>R: Conventional PR title, flag expiry
  opt Timebox elapsed
    O->>U: Confirm or kill
    O->>O: Prune flag or slice
  end
```

1. **Grilling:** If the idea is still mushy, interview until the decision frontier is clear — including contract vs bet.
2. **PRD / bet:** For bets, write problem, belief, leading indicator, timebox, kill criteria, cheapest experiment, and flag plan (`agent-prd`). Tiny contracts may skip this.
3. **Stories then spec:** INVEST tickets (Hypothesis block on bets; flags in Notes), then Gherkin including flag off/on/kill when flagged.
4. **TDD:** Inventory the behavior catalog (both flag states), then gear 1 (domain) and gear 2 (thin adapters) in the same loop. EDD lives here when the change is a prompt or tool schema.
5. **XFN:** Green the apply rows (accessibility, load, security) or skip with a reason — including flag-on surfaces in scope.
6. **Audit:** Security and architecture-drift checks, then pre-commit.
7. **Telemetry and release:** Map SLOs and the bet’s leading indicator, ship with a conventional PR title, record flag expiry and rollback.
8. **Close the loop:** After the timebox, confirm (default on, prune flag) or kill (flag off, prune slice).

[Orchestrator skill](https://github.com/mzworthington/waykit/blob/main/skills/agent-orchestrator/SKILL.md) · [Coding philosophy](https://github.com/mzworthington/waykit/blob/main/CODING_PHILOSOPHY.md) · [EDD guide (alpha)](/docs/edd) · [Hosts](/docs/hosts)
