# Changelog

## 2026-09-01

### 🚀 Features

- *(evals)* Cover missing skills and kit-knowledge get_handover (#31)
- Cleanup index.html
- Add analytics
- *(lang-typescript)* Enforce strict typing rules and add anti-pattern evaluations
- *(cloudflare)* Integrate Cloudflare operations into the agent lifecycle kit
- Improve UX on index.html
- *(release)* Wire git-cliff changelog and GitHub Releases (#32)
- *(install)* Prefer SHA-256 verified install over curl|sh (#34)
- *(ontology)* Typed kit index, knowledge getters, and memory allowlist (#47)
- Ontology
- Migrate site to React

### 🐛 Bug Fixes

- Update analytics script source and configuration in 404.html and index.html
- Remove unnecessary send parameter from analytics script in 404.html and index.html
- *(release)* Version-scope GitHub release notes and sync tags (#45)
- Track kit site assemble sources for Pages deploy (#48)

### 🧰 Maintenance & Dependencies

- *(edd)* Remove otelop demo shell, keep closed-loop kit spans (#30)
- *(security)* SECURITY, CONTRIBUTING, Dependabot, and CodeQL (#37)
- Fold promote into verify and drop redundant EDD workflow (#43)

### 📚 Documentation

- *(philosophy)* Add applicability opt-out and seed kit ADRs (#36)
- Refresh kit value review and track open findings (#44)

## 2026-08-31

### 🚀 Features

- Harden and streamline setup, including one line install
- Enhance cursor configuration handling in MCP and project initialization
- *(edd)* Agent eval depth metrics, safety, and dataset hygiene
- *(site)* Today job flow, stronger demo, and first-session onboarding (#25)
- *(edd)* Otelop via mise, shadow eval CLI, and OTel fixtures (#28)
- *(debug)* Promote IDE agent misses to EDD via debug and lessons (#29)

### 🐛 Bug Fixes

- Update installation instructions to use sh instead of bash for improved compatibility
- *(site)* Mobile job command copy and balanced job grid (#26)
- *(site)* Lock Around the eval loop to a 2x2 grid (#27)

### 🧰 Maintenance & Dependencies

- Remove obsolete .skill-lock.json file as part of cleanup
- Publish meaningful GitHub Actions job summaries (#24)

## 2026-08-30

### 🚀 Features

- Tweak styling
- Index.html performance improvement
- *(evals)* Add Eval-Driven Development (EDD) harness
- *(evals)* Enrich EDD Markdown reports with failure traces
- *(mcp)* Thin bootstrap and kit-knowledge context split
- *(skills)* Encode human-centric voice in agent-copy
- *(skills)* Wire agent-copy into docs and orchestration routing
- *(eval)* Enhance eval scripts and datasets for improved routing and knowledge evaluation
- *(site)* Add lifecycle section and diagrams to enhance documentation

### 🐛 Bug Fixes

- *(site)* Restore full-bleed interactive D3 constellation
- *(site)* Restyle Start here docs as a readable path grid
- *(site)* Update 404 page and links for EDD guide

### 🧰 Maintenance & Dependencies

- *(site)* Update links and metadata for Eval-Driven Development

### 📚 Documentation

- Put Eval-Driven Development front and center
- *(edd)* Polish EDD links, copy, and report path consistency
- Lead with product value and EDD as the agentic default

### 🎨 Styling

- *(site)* Humanize landing copy and soften AI-default visuals
- *(site)* Align EDD badge color with teal palette
- *(site)* Update layout and spacing for improved responsiveness and consistency

## 2026-08-28

### 🚀 Features

- Improve evals and scripts
- Implement comprehensive evaluation benchmark suites and individual skill-level test definitions
- Implement security and supply chain audit tools with CI integration and anti-pattern evaluation suites
- Add SKILL.md frontmatter validation, high-entropy secret detection, external skill pinning, and pre-commit hook installation script.
- Implement husky-based git hooks, enforce stricter CI security, and add schema validation for evals
- Implement agent lifecycle kit with IDE configuration templates, skill trigger evaluation harness, and automated CI validation.
- Add co-located evaluation suites and standard documentation for agent skills
- Add kit CLI, new agent-copy skill, and revamp project documentation
- Configure GitHub Pages deployment workflow and add documentation link to README
- Add index.html landing page for GitHub Pages
- Homepage fun

### ⚙️ Refactoring & Performance

- Update CI actions to use tags and expand security scanner to support versioned pins
- Standardize agent bootstrap documentation paths and update lifecycle roles in README and workspace configuration

### 🧰 Maintenance & Dependencies

- Migrate package manager from npm to pnpm in scripts and CI workflow

## 2026-08-13

### 🚀 Features

- Fold TDD short loop and expand kit roles, profiles, MCPs

### 🐛 Bug Fixes

- Make agent-prune discoverable via model invocation

## 2026-08-10

### 📚 Documentation

- Require conventional titles for commits and PRs

## 2026-08-08

### 🧰 Maintenance & Dependencies

- Update .gitignore to exclude pnpm store database file
- Update .gitignore to include environment files and secrets

## 2026-08-07

### 🚀 Features

- Add agent-debug skill with hypothesis-driven SOP and tooling

## 2026-08-06

### 🚀 Features

- Update .gitignore to exclude upstream skills and enhance documentation for skills structure
- Add complexity hotspots SOP and extend agent-prune with complexity track

## 2026-08-03

### 🚀 Features

- Add MCP library with compose profiles and install wiring
- Expand MCP catalog with collab and project profiles
- Add Chrome DevTools, Cloudflare, Next.js, LinkedIn, Bitwarden, Polyglot MCPs
- Add Obsidian MCP to personal profile
- Add Raspberry Pi MCP via SSH to lab profile
- Sync official Cloudflare and Vercel skills via gh skill
- Add agent-adr for sparse MADR records under docs/ADRs
- Introduce dead-code pruning and pre-commit checks; update documentation for agent skills and handover process

## 2026-08-02

### 🚀 Features

- Treat tests as behavior catalog in lifecycle design
- Add agent-xfn for cross-functional quality tests
- Enforce behavior catalog and XFN across the lifecycle

## 2026-07-25

### 🚀 Features

- YAGNI coding

## 2026-07-24

### 🚀 Features

- Lifecycle role skills, language/framework profiles
- Lessons for learning loop, including retro
- Add csharp skill and rename dotnet skill

### ⚙️ Refactoring & Performance

- Update documentation for clarity and consistency; enhance coding philosophy with DDD, vertical slices, and clean code principles
- Rename and restructure AGENTS.md and GEMINI.md for clarity; update installation instructions and project integration guidance
