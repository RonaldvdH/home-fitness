# AGENTS.md — Home Fitness Studio

Instructions and engineering guidelines for AI coding agents and human contributors working in this repository.

> **This repository is primarily developed by AI coding agents.** All architectural contracts, roadmap phases, and quality guardrails live inside this repository and must be followed strictly on every change.

## 1. Authoritative Docs & Working Protocol

Before implementing any feature or fix:

1. Check [`docs/ROADMAP.md`](docs/ROADMAP.md) to understand the current phase, scope, and mandatory guardrails.
2. Read relevant Architecture Decision Records in [`docs/ADR/`](docs/ADR/):
   - [`0001-preact-typescript-offline-pwa.md`](docs/ADR/0001-preact-typescript-offline-pwa.md) — Stack, offline PWA, `StorageAdapter`, lazy loading
   - [`0002-procedural-3d-mannequin-demonstrator.md`](docs/ADR/0002-procedural-3d-mannequin-demonstrator.md) — Procedural Three.js 3D mannequin + 2D SVG fallback
   - [`0003-foldable-flex-mode-layout.md`](docs/ADR/0003-foldable-flex-mode-layout.md) — Galaxy Z Flip Flex / Floor Mode split contract
   - [`0004-spaces-equipment-and-workout-styles.md`](docs/ADR/0004-spaces-equipment-and-workout-styles.md) — Workout Spaces, equipment tags, and Pilates/Mobility styles
   - [`0005-shadcn-base-ui-component-primitives.md`](docs/ADR/0005-shadcn-base-ui-component-primitives.md) — Standardize interactive UI primitives with `shadcn` + Base UI (`src/components/ui/`)
   - [`0006-conventional-commits-semver-releases.md`](docs/ADR/0006-conventional-commits-semver-releases.md) — Conventional Commit PR titles & automated SemVer tags/releases
3. Check [`docs/EXCEPTIONS.md`](docs/EXCEPTIONS.md) before flagging or refactoring minor style/lint exceptions so already-approved 1-off exceptions are never re-reported.
4. Ship every phase or fix on a feature branch via pull request (never push directly to `main`) using a **Conventional Commit PR title** (`feat(scope): ...`, `fix(scope): ...`, `docs: ...`), updating `docs/ROADMAP.md` when a phase completes.

### Rule Compliance, Exceptions & Escalation Protocol

Be **strict** on architectural boundaries (pure domain/engine, schema migrations, 60 FPS non-re-rendering stage, 360px zero-overflow mobile layout, bundle budget) and **pragmatic** on trivial syntax preferences. Whenever code conflicts with a repo rule or guideline, follow these 3 options in order:

1. **Refactor code to comply** — Default action for architectural, correctness, and straightforward quality violations.
2. **Document new pattern or approved 1-off exception** — If introducing a valid new architectural concept/pattern, document it in [`docs/ADR/`](docs/ADR/) and `AGENTS.md`. If making a justified trivial 1-off exception (never for core architectural invariants), record a concise entry in [`docs/EXCEPTIONS.md`](docs/EXCEPTIONS.md) with rationale and a revisit trigger so future AI agents do not re-report it.
3. **Stop & escalate recurring friction** — If the same violation or guideline tension **keeps coming back** across changes, **stop coding**, explain to the user _why_ it keeps recurring, and present concrete options (e.g., refactor the underlying abstraction, adjust the rule, or formalize a new pattern) before proceeding.

### Token & GitHub Actions Build-Minute Efficiency

- **Run fast local checks before pushing** (`pnpm typecheck && pnpm lint && pnpm fmt:check && pnpm test && pnpm build`) so GitHub Actions is never burned on trial-and-error retries.
- **Prefer automated checks over prose**: codify enforceable rules in Vitest/oxlint/scripts rather than long manual instructions.
- **Keep docs concise**: write terse, scannable ADRs, roadmap entries, and exception rows to minimize token load for future agent sessions.

## 2. Project Overview & Tech Stack

**Home Fitness Studio** is an offline-first home interval workout trainer featuring a 60 FPS procedural form demonstrator, wall-clock interval timer with Screen Wake Lock, Web Audio interval beeps + optional Web Speech voice cues, a tag-driven workout builder, and versioned `localStorage` persistence with JSON backup/restore.

- **Package Manager**: `pnpm` (`packageManager` pinned in `package.json`; do not commit `npm` or `yarn` lockfiles)
- **UI & Language**: Preact (`preact`) + strict TypeScript (`typescript`)
- **Bundler / Dev Server / PWA**: Vite (`vite.config.ts`) + `vite-plugin-pwa` (supports subpath builds via `VITE_BASE_PATH`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + custom CSS in `src/styles/main.css`
- **Linting & Formatting**: `oxlint` (`.oxlintrc.json`) + `oxfmt` (`.oxfmtrc.json`)
- **Testing**: Vitest (`vitest.config.ts`, `happy-dom`, `@testing-library/preact`)

## 3. Common Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start Vite dev server
pnpm check          # Fast full local gate: typecheck, lint, fmt:check, test, build, check:budget
pnpm typecheck      # Run strict TypeScript typecheck (tsc --noEmit)
pnpm lint           # Run oxlint --deny-warnings across the repository
pnpm fmt            # Auto-format files with oxfmt
pnpm fmt:check      # Check formatting without modifying files
pnpm test           # Run unit, contract, architecture & component tests (vitest run)
pnpm test:watch     # Run tests in watch mode
pnpm build          # Production PWA build to dist/
pnpm check:budget   # Enforce initial entry JS/CSS gzipped bundle-size budgets
pnpm test:e2e       # Run Playwright Chromium mobile overflow & flow tests against dist/
pnpm preview        # Preview production build
```

## 4. Project Structure & Separation of Concerns

Keep modules strictly organized by responsibility:

```text
├── .github/workflows/
│   ├── ci.yml                  # CI pipeline: PR title check, typecheck, lint, fmt, test, build, E2E
│   ├── deploy-pages.yml        # GitHub Pages subpath PWA deployment with live version stamp
│   └── release.yml             # Automated Conventional Commits SemVer git tag & GitHub Release
├── docs/
│   ├── ROADMAP.md              # Multiphase feature & quality guardrail roadmap
│   ├── EXCEPTIONS.md           # Approved 1-off trivial exceptions (do not re-flag)
│   └── ADR/                    # Architecture Decision Records
├── e2e/
│   └── mobile-and-flows.spec.ts # Playwright 360px/390px/1280px zero-overflow & core E2E flows
├── scripts/
│   ├── check-bundle-budget.mjs # Initial entry JS/CSS gzipped bundle budget gate
│   └── semver.mjs              # Zero-dep Conventional Commits validator & SemVer calculator
├── index.html                  # Minimal PWA HTML shell mounting #app
├── public/icon.svg             # Scalable PWA & favicon icon
├── tsconfig.json               # Strict TypeScript config (jsxImportSource: "preact")
├── vite.config.ts              # Vite + Preact + Tailwind v4 + vite-plugin-pwa
├── vitest.config.ts            # Vitest + happy-dom configuration
├── playwright.config.ts        # Chromium-only Playwright E2E configuration
├── src/
│   ├── main.tsx                # Preact entrypoint mounting <App />
│   ├── styles/main.css         # Tailwind v4 entry, @theme tokens, spotlights, overflow guard
│   ├── domain/
│   │   ├── schema.ts           # Versioned TS types (AppDataV3), tags, validators, migrations
│   │   ├── defaults.ts         # Default exercises, warm-up/cool-down, routine factories
│   │   ├── presets.ts          # Tagged exercise catalog & varied workout circuit builder
│   │   └── timeline.ts         # Pure timeline builder, duration calculation, MM:SS formatting
│   ├── engine/
│   │   ├── animations.ts       # Pure typed 60 FPS SVG pose registry & easing math
│   │   └── timer.ts            # Drift-free wall-clock timer state machine (injectable clock)
│   ├── services/
│   │   ├── storage.ts          # StorageAdapter seam + LocalStorageAdapter + JSON backup helpers
│   │   ├── audio.ts            # Web Audio API interval beep synthesizer
│   │   ├── speech.ts           # Optional Web Speech API voice coaching announcements
│   │   ├── wakeLock.ts         # Screen Wake Lock API wrapper with visibilitychange re-acquire
│   │   └── foldable.ts         # Viewport Segments Flex Mode detection + manual Floor Mode controller
│   ├── state/
│   │   └── workoutStore.ts     # Encapsulated reactive store wiring data, timer, preview, services
│   └── components/
│       ├── App.tsx             # Root shell, keyboard shortcuts, Floor Mode & modal coordination
│       ├── HeaderBar.tsx       # Compact mobile-first timer pill, transport, Floor Mode & audio/voice toggles
│       ├── FlexWorkoutView.tsx # Galaxy Z Flip Flex / Floor Mode split layout (top display, bottom controls)
│       ├── WorkoutStage.tsx    # Active/preview exercise stage, New Workout bar, form cues, Up Next
│       ├── AthleteSvg.tsx      # 60 FPS ref-driven SVG renderer (zero per-frame Preact re-renders)
│       ├── RoutineSidebar.tsx  # Exercise list controls (preview, reorder, toggle, edit, delete, backup)
│       ├── ToastHost.tsx       # Accessible live-region toast notifications
│       ├── ui/
│       │   └── dialog.tsx      # shadcn + Base UI Dialog primitive (@base-ui/react/dialog)
│       └── modals/
│           ├── ModalDialog.tsx     # Shared modal shell composing @/components/ui/dialog
│           ├── NewWorkoutModal.tsx # 1-screen duration + muscle group workout builder with Shuffle
│           ├── ExerciseModal.tsx   # Add/Edit exercise with animation, equipment & tag chips
│           ├── SettingsModal.tsx
│           └── HistoryModal.tsx
└── tests/
    ├── architecture.test.ts    # Pure domain/engine, StorageAdapter, ModalDialog & EXCEPTIONS sync
    ├── catalog.contract.test.ts # Exercise catalog completeness, tag validity & preset matrix checks
    ├── foldable.test.ts        # Viewport Segments auto-detection & manual Floor Mode state machine
    ├── modal-dialog.test.tsx   # Base UI Dialog rendering, close button & Escape dismissal
    ├── schema.test.ts          # Schema validation, v2 -> v3 migration, tag inference, corrupt recovery
    ├── presets.test.ts         # Tag filtering, variation/shuffle, custom exercises, duration accuracy
    ├── timeline.test.ts        # Timeline ordering, overrides, formatting
    ├── timer.test.ts           # Wall-clock sleep/drift recovery, pause/resume, completion guards
    ├── animations.test.ts      # Math helpers, supination & viewBox invariants across all animations
    └── app.component.test.tsx  # Preact integration tests
```

## 5. Architectural Guidelines & Conventions

1. **Keep Domain & Engine Logic Pure & Testable**:
   - Everything in `src/domain/` and `src/engine/` must remain free of DOM (`document`/`window`) and UI (`preact`) dependencies so it can be tested directly and deterministically in Vitest (enforced by `tests/architecture.test.ts`).
2. **Never Trigger 60 FPS Preact Re-Renders**:
   - `AthleteSvg.tsx` (and future `Stage3D.tsx`) mutates refs/GPU buffers directly inside `requestAnimationFrame` and pauses while `document.hidden`. Keep per-frame animation math inside `src/engine/`.
3. **Preserve Offline-First Persistence & Backwards Compatibility**:
   - All persistence goes through the `StorageAdapter` interface in `src/services/storage.ts` (enforced by `tests/architecture.test.ts`).
   - Any schema evolution must increment `SCHEMA_VERSION` in `src/domain/schema.ts` and preserve automatic lossless migration from all prior versions and JSON backups.
4. **Adding a New Exercise or Animation**:
   - Animations: add the new key to `ANIMATION_IDS` in `src/domain/schema.ts` and implement its entry in `ANIMATION_REGISTRY` in `src/engine/animations.ts` (`ANIMATION_OPTIONS`, `ExerciseModal`, and `tests/animations.test.ts` update automatically).
   - Exercises: tag every catalog exercise with accurate `muscleGroups`, `durations` (and `requiredEquipment` + `styles` once Phase 3 lands), ≥ 3 clear steps, and a concise `tip` (enforced by `tests/catalog.contract.test.ts`).
5. **Respect Narrow Mobile & Foldable Ergonomics**:
   - Design for `360px` unfolded mobile screens (e.g., Galaxy Z Flip) with **zero horizontal overflow** (enforced by `e2e/mobile-and-flows.spec.ts`). Always add `min-w-0` on CSS Grid/Flex children with truncating content.
   - Modals must use the shared dialog primitive (`ModalDialog.tsx`, migrating to `shadcn` + Base UI `Dialog` per [`ADR-0005`](docs/ADR/0005-shadcn-base-ui-component-primitives.md); enforced by `tests/architecture.test.ts`).
   - Keep transport buttons touch-friendly and keyboard shortcuts disabled while typing in form fields or when modals are open.
6. **Standardize Interactive UI Primitives (`shadcn` + Base UI)**:
   - Use **`shadcn` + Base UI (`@base-ui/react`)** in `src/components/ui/` for all reusable interactive primitives (dialogs, drawers/sheets, switches, selects, tabs, toggle groups, popovers, toasts).
   - **Only build a component from scratch when it does not exist in the library**, and follow `shadcn` + Base UI conventions as closely as possible (composable parts, `cn()` class merging, `data-slot`/`data-state` hooks, accessible ARIA/keyboard contracts; see [`ADR-0005`](docs/ADR/0005-shadcn-base-ui-component-primitives.md)).

## 6. Verification Checklist Before Finishing Changes

Run the unified local gate (and E2E when UI/layout/config changes) before committing or opening a PR:

```bash
pnpm check          # typecheck + lint (--deny-warnings) + fmt:check + test + build + check:budget
pnpm test:e2e       # Playwright 360px/390px/1280px zero-overflow & flow tests (required on UI changes)
```
