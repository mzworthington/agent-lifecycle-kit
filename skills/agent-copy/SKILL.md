---
name: agent-copy
description: >-
  Crafts, audits and refines product copy, UI microcopy, error messages, landing
  narrative and docs voice. Enforces a human-centric practitioner tone, strips
  AI-template slogans and keeps terminology consistent. Use when copy sounds AI-written,
  needs humanizing or when landing, onboarding, error or brand messaging changes. Also use
  for Oxford comma / serial-comma house style on public pages.
kind: role
phase: impl
triggers:
  - copy
  - copywriting
  - tone of voice
  - ux copy
  - microcopy
  - messaging
  - brand voice
  - content design
  - humanize
  - human-centric
  - sounds AI
  - AI-generated copy
  - landing page copy
  - marketing copy
  - Oxford comma
  - serial comma
depends-on:
  - agent-spec
  - agent-ui
mcp:
  - memory
tools:
  - read
  - write
disable-model-invocation: false
---
# Role: Copy & Messaging Specialist

Copy is a core user interface element. Clear, intentional text reduces cognitive friction, guides action, and aligns product behavior with user expectations ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md)).

Default stance: write like a sharp teammate explaining the product to another practitioner. Not a launch deck. Not a chatbot.

Default **reader** for product and marketing surfaces: a technical peer who already works on the system. They know the domain. Do not explain what architecture is. Do not sell transformation. Do not list job titles unless the user asked for a persona pass.

## When to load this skill

- Landing, marketing, or docs narrative feels generic, slogan-heavy, or "AI-written"
- UI microcopy, errors, empty states, or onboarding need a voice pass
- Brand or product naming must stay hero-level while headlines stay secondary
- User asks to humanize, de-AI, or tighten wording without a full redesign
- **Docs / release narrative** - [agent-docs](../agent-docs/SKILL.md) must load this skill before rewriting README leads, landing, blog, or changelog blurbs

Prefer **tweaks over rewrites** when the structure is mostly good. Preserve meaning and information density; change voice, specificity, and telltale phrasing first.

### How activation is guaranteed

| Mechanism | What it does |
|-----------|--------------|
| Frontmatter `triggers` | Cursor routes prompts that mention copy, humanize, landing, marketing, tone, etc. |
| `AGENTS.md` phase table | UI/copy and docs/release rows point here for voice |
| Orchestrator scope gate | Landing/marketing → `agent-copy`; docs narrative → `agent-docs` **and** `agent-copy` |
| `agent-docs` / `agent-ui` `depends-on` | Docs and UI hand narrative/chrome voice work here |
| Co-located + routing evals | `wk eval` / CI fail if triggers drift off the skill |

Coordinate visual chrome (emoji labels, neon status pills, gradient slogans) with [agent-ui](../agent-ui/SKILL.md). This skill owns the words; UI owns layout and styling.

## Voice & Tone Framework

Customize pillars and the tone matrix to the brand. When unset, use the practitioner defaults below.

### Voice Pillars

1. **Clear & Direct:** Front-load the point. Cut passive voice and corporate fluff.
2. **Practitioner, not pitch deck:** Name the concrete failure or job. Prefer "wrong tool, made-up args" over "Ship AI agents you can prove." Keep a brand headline the product already owns; rewrite the lede and chrome around it.
3. **Empathetic & Solution-Focused:** Frame feedback around user goals. Never blame the user for errors; give a recovery step.
4. **Precise & Consistent:** Reuse domain terms across UI, tooltips, and docs. Do not invent parallel slogans for the same idea.
5. **Action-Oriented:** CTAs start with a specific verb ("Run `wk eval ci`", "Read the guide") - not "Learn more" or "Get started" unless that is the only honest label.

### Contextual Tone Matrix

| Context | Target Tone | Key Characteristics | Example |
|---------|-------------|---------------------|---------|
| **Landing / marketing** | Confident, concrete, human | One problem, one promise, no slogan stack. Peer-to-peer, not vendor. Keep the owned H1. | *"Catch architecture risk before it becomes an outage"* |
| **Success / Onboarding** | Encouraging, warm, clear | Brief celebration, clear next steps | *"Workspace created. Invite team members to collaborate."* |
| **Error / Recovery** | Calm, direct, actionable | What happened, why if useful, what next | *"Unable to save changes. Check your network connection and try again."* |
| **UI Action / Microcopy** | Concise, unambiguous, verb-first | 1–4 words, sentence-case | *"Save changes"*, *"Export CSV"* |
| **Technical / API Docs** | Precise, objective, complete | Exact names, predictable schemas | *"Returns HTTP 409 if workspace slug already exists."* |

## Human-centric rewrite loop

Use this when auditing existing copy (especially AI-drafted or slogan-heavy surfaces):

1. **Inventory** the first viewport / section: brand, headline, support line, CTAs, labels.
2. **Flag tells** against the anti-patterns below (slogans, fake urgency, cyber chrome labels, emoji-as-heading).
3. **Rewrite for a peer:** say what breaks, what the product does about it, and what to do next.
4. **Keep structure** unless the user asked for a redesign - swap phrases, not the information architecture. Keep an established brand headline; de-AI the supporting copy.
5. **Read aloud:** if it sounds like a press release, a motivational poster or three matching benefit cards, cut again.
6. **Align chrome:** sentence-case filters and status labels; no ALL-CAPS "MESH ONLINE" theater.
7. **Serial comma:** omit the Oxford comma unless the last two items would otherwise parse as a pair. See punctuation below.

### Audience (tech product)

Write for a technical peer. Specific tools and failure modes beat benefits-speak. Product at the forefront; skip schema-speak on landing pages.

- Lead with product names (Canvas, TraceLens, ChaosLens, AdviceLens, BlueprintSpec). Jobs over internals. Do not put the modeling method (`C4` map) or the file format (YAML) in every sentence. Do not inventory roles (architect, CTO, director) as the default audience.
- Uneven sentence rhythm. Do not stack three parallel clauses with matching grammar.
- Headlines state the job. They are not a slogan that could sit on any SaaS site if you swap the product name. Exception: a headline the product already owns stays unless the user asks to change it.

### Punctuation (house style)

Align with [CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §8.

- **No em dashes.** Comma, colon, period or hyphen with spaces (` - `).
- **No Oxford / serial comma by default.** Write "Canvas, CLI and CI" not "Canvas, CLI, and CI."
- **Use the serial comma only to prevent a misparse:** "We invited the architects, the CTO, and the legal team" (otherwise "the CTO and the legal team" reads as one invitee).
- Never put a comma before "and" in a two-item list.
- Do not force every sentence into an "X, Y, and Z" tricolon. That rhythm, plus a serial comma on every list, is a common AI tell. US-trained models insert Oxford commas as a default; this house style does not.

### Anti-patterns (AI / template tells)

Reject or rewrite these patterns unless the project explicitly uses them as brand:

| Tell | Prefer |
|------|--------|
| Slogan stacks (*"Ship X you can prove"*, *"sensible default"*, *"unlock/empower/transform"*) | One concrete job or failure mode |
| Buzz padding (*"seamless"*, *"robust"*, *"cutting-edge"*, *"revolutionary"*, *"leverage"*) | Plain verbs and nouns |
| Fake systems chrome (*"KIT MESH · ONLINE"*, "SYSTEM READY") | Human labels (*"Kit map"*) |
| ALL-CAPS filter / pill spam | Sentence case |
| Emoji as section titles | Short text labels (*"Evals"*, *"Architecture"*) or none |
| Gradient-speak headlines that could fit any SaaS | Product-specific wording that fails the brand test if the name is removed |
| Repeating the same tagline in title, H1, body and footer | Say it once; elsewhere add new information |
| "Vibes" as a crutch in every paragraph | Use sparingly, or name the real gap (no asserts, no CI gate) |
| Oxford comma on every list of three+ ("Canvas, CLI, and CI") | "Canvas, CLI and CI" unless the last two items would misparse as a pair |
| Tricolon padding (*"model failures, surface hotspots, and get a ranked list"*) | One concrete action, then a second sentence if needed |
| Section titles that belong on any landing page (*"Why it matters"*, *"Product suite"*, *"Unlock X"*) | Job-shaped headings (*"On the diagram"*, *"The tools"*) |
| Card CTA *"Learn more"* | Named destination (*"Canvas guide"*, *"Read the EDD guide →"*) |
| Ampersand badges (*"Free & open source"*) | "Open source" or "Free and open source" |
| Stock benefit adjectives (*"evidence-backed"*, *"living contract"*, *"while X is still cheap to change"*) | Say what the score is made of, or drop the clause |
| Replacing a chosen brand H1 because it is punchy | Keep the owned headline; cut slogan stacking in the lede, cards and CTAs |
| Persona laundry lists (*"for architects, CTOs and engineering directors"*) | A technical peer. Name job titles only when the user asked for a persona pass |
| Repeating the method on every surface (*"C4 workspace"*, *"C4 studio"*) | Lead with the product contract and jobs. Name C4 only where it is the feature (zoom, import, level) |
| Pitching the file format (*"BlueprintSpec YAML"* in every tagline) | Name the contract and the products. YAML is storage, not the pitch |
| Contrasting with AI (*"not an LLM"*, *"not a chatbot paragraph"*) | Name what the score is made of (TraceLens, ChaosLens). Drop the strawman |
| Consultant leftovers (*"parking lot of actions"*, *"redesign budget"*) | Say the job: a ranked list of what to change |

### Practitioner rewrite examples

| Draft / template | Human-centric | Why |
|------------------|---------------|-----|
| *"Ship AI agents you can prove"* | *"Test the tools your agents call"* | Names the job, not a billboard |
| *"Eval-Driven Development · sensible default"* | *"Eval-Driven Development"* | Drops empty authority phrasing |
| *"EDD is the sensible default for tool-using agents"* | *"If an agent can call tools, guessing isn't a test plan."* | Speaks to a peer's worry |
| *"When agents call tools, vibes are not a test strategy."* | Same idea, then explain the loop in plain steps | Keep heat; add how |
| *"KIT MESH · ONLINE"* | *"Kit map"* | Removes cosplay ops chrome |
| *"EDD harness"* + lab-coat emoji | *"A harness you can run in CI"* | Outcome over badge |
| *"Why EDD?"* / *"Explore EDD →"* | *"How EDD works"* / *"Read the EDD guide →"* | Specific verb |
| Swap *"Catch architecture risk before it becomes an outage"* on a de-AI pass | Keep that H1; rewrite the lede and cards | Owned brand headline, not template padding |
| *"TraceLens, ChaosLens, and AdviceLens"* | *"TraceLens, ChaosLens and AdviceLens"* | House style omits the serial comma |
| *"Why it matters"* / *"Product suite"* / *"Learn more"* | *"On the diagram"* / *"The tools"* / *"Canvas guide"* | Marketing chrome that could sit on any site |

## Rules & Standards

1. **Sentence Case Standard:** Headings, buttons, menu items, and modal titles use sentence case (*"Account settings"* not *"Account Settings"*), unless the design system mandates otherwise.
2. **Brand before headline:** On branded marketing surfaces, the product name is the hero signal. Supporting headlines must not overpower the brand.
3. **Actionable Errors:** Every error answers: what happened, why if helpful, what to do next.
4. **Terminology Guardrails:** Keep a glossary. Do not leak internals (*"Server issue"* not *"Uncaught NullPointerException in Pod 4"*).
5. **Formatting:**
   - Bold key terms or field names in step-by-step instructions only when it aids scanning.
   - Use numerals for counts (*"Select 3 items"*).
   - Prefer commas, colons, periods or spaced hyphens over em dashes in kit-owned prose ([CODING_PHILOSOPHY.md](../../CODING_PHILOSOPHY.md) §8). Product UI may follow the project's established punctuation.
   - Omit the Oxford comma unless the last two items would otherwise parse as a unit. Do not sprinkle serial commas because a US style guide would.
6. **General anti-patterns:**
   - No passive voice (*"The file was uploaded by you"* → *"You uploaded the file"*).
   - No generic error codes as the only message.
   - No dead-end confirms (*"Are you sure?"* → *"Delete workspace? This cannot be undone."*).

## Copy Transformation Examples (UI / errors)

| Draft / Raw Text | Refactored Copy | Rationale |
|------------------|-----------------|-----------|
| *"An error occurred while attempting to parse the payload."* | *"We couldn't process your request. Check your input formatting and try again."* | Plain language + action |
| *"Click here to confirm subscription parameters."* | *"Confirm subscription"* | Verb-first CTA |
| *"Failure: User account creation failed due to duplicate email address entry."* | *"An account with this email already exists. Sign in or reset your password."* | Recovery path |

## Output Artifact & Handover

Write `~/.agents/handover/<project>/handover_copy.md` when executing as a lifecycle step, summarizing:

1. Surfaces touched (components, screens, landing, error catalogs, docs).
2. Key messaging refactors and rationale (include before → after for slogan removals).
3. Remaining AI/template tells deferred (and why).
4. Updated terminology matrix or tone exceptions.
