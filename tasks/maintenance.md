---
title: Codebase Maintenance Schedule
kind: task
frequency: weekly
triggers:
  - maintenance
  - dependency audit
  - housekeeping
---
# Codebase Maintenance Schedule

Run this routine checklist weekly to audit codebase health, security vulnerabilities, and dependency drift.

- [ ] **Dependency Audit**
  - Run package vulnerability check: `pnpm audit` / `npm audit` / `dotnet list package --vulnerable`.
  - Check for outdated dependencies: `pnpm outdated`.
- [ ] **Static Code Analysis**
  - Run linter checks: `pnpm lint` / `mvn checkstyle:check`.
  - Look for dead code / unused exports: `npx knip` or IDE analysis.
- [ ] **Test Coverage Verification**
  - Execute test suite with coverage logging enabled.
  - Verify that coverage has not drifted below the established project threshold (e.g. 80%).
- [ ] **Secrets & Config Audit**
  - Check repository status to ensure no local `.env` files or secrets are tracked in git history.
  - Audit `.env.example` configurations to verify all newly added application variables are documented.
