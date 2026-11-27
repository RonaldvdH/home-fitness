# Documented Guideline Exceptions

This registry records **approved trivial or one-off exceptions** to lint, style, or minor repo conventions so fresh AI agents do **not** repeatedly re-report or churn already-decided edge cases.

> **Rules for AI Agents**:
>
> 1. Check this table before reporting or refactoring a minor rule exception. Do **not** re-flag active entries unless their **Revisit When** condition is triggered.
> 2. **Architectural invariants are NOT eligible for trivial exceptions** (pure `src/domain/` & `src/engine/`, lossless schema migrations, zero 60 FPS Preact re-renders, 360px zero-overflow layout, bundle budget). Any change to those requires an ADR in [`docs/ADR/`](./ADR/) or explicit user approval.
> 3. If the same exception or friction keeps recurring across PRs, **stop and ask the user** why it keeps returning and propose concrete options (see [`AGENTS.md`](../AGENTS.md)).

## Active Exceptions

| ID       | Scope                            | Rule / Guideline                          | Rationale                                                                                                              | Added              | Revisit When                  |
| -------- | -------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------- |
| `EX-001` | `src/main.tsx`, `.oxlintrc.json` | `import/no-unassigned-import` for `*.css` | Vite requires a side-effect CSS import (`import './styles/main.css'`) to bundle Tailwind v4 styles into the app entry. | 2026-11-25 (PR #1) | Never (standard Vite pattern) |
