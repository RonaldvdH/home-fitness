# ADR-0005: Standardize Interactive UI Primitives with shadcn + Base UI

- **Status**: Accepted
- **Date**: 2026-11-27

## Context

Hand-rolling interactive UI primitives (dialogs, drawers/sheets, switches, selects, tabs, toggle groups, popovers, toasts) creates recurring accessibility, focus-trap, portal, scroll-lock, and keyboard-handling bugs (e.g., the `ModalDialog.tsx` `Escape` listener timing race caught by Playwright in PR #6). In an AI-developed repository, custom one-off component APIs also drift across phases and waste tokens re-inventing solved UX primitives.

## Decision

1. **Do Not Build Interactive Primitives From Scratch**:
   - Standardize all reusable interactive UI primitives on **shadcn + Base UI (`@base-ui/react`)**, generated into `src/components/ui/` and owned directly in the repository (styled with Tailwind CSS v4).
   - Examples: `Dialog`, `Drawer`/`Sheet`, `Switch`, `Select`, `Tabs`, `ToggleGroup`, `Popover`, `Tooltip`, `Toast`.
   - Domain-specific views (`WorkoutStage`, `FlexWorkoutView`, `AthleteSvg`, `Stage3D`) compose these primitives rather than re-implementing modal backdrops, focus traps, or custom accessible controls.
2. **Preact Compatibility (`preact/compat`)**:
   - Use `@preact/preset-vite`'s built-in `react` / `react-dom` -> `preact/compat` aliasing (plus matching `tsconfig.json` path mappings when initializing `components.json` with the Base UI preset).
   - Every newly added `shadcn` + Base UI primitive must be verified with both `pnpm check` (including bundle budget) and `pnpm test:e2e` (Playwright Chromium).
   - If a Base UI primitive hits a genuine `preact/compat` incompatibility, follow the `AGENTS.md` Option 3 escalation protocol (stop and propose options rather than hacking around it silently).
3. **Incremental Adoption**:
   - All **new** interactive primitives added in Phase 2+ must be generated via `shadcn` + Base UI into `src/components/ui/`.
   - Migrate the existing hand-rolled `src/components/modals/ModalDialog.tsx` onto `shadcn` + Base UI `Dialog` when initializing `src/components/ui/` (keeping the `tests/architecture.test.ts` invariant that all modals use the shared dialog primitive).

## Consequences

- Standardized, accessible, battle-tested component primitives across all future phases.
- Eliminates hand-rolled focus, portal, scroll-lock, and keyboard dismissal bugs.
- Tree-shakeable Base UI primitives keep initial bundle size within the `55 kB` gzip entry budget enforced by `scripts/check-bundle-budget.mjs`.
