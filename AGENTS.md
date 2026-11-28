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
   - [`0007-modular-boundaries-and-production-standards.md`](docs/ADR/0007-modular-boundaries-and-production-standards.md) — Module anatomy, 500-line file ceiling, offline-first & selector isolation standards
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
│   │   ├── schema.ts           # Versioned TS types (AppDataV4), WorkoutSpace, tags, pure predicates
│   │   ├── tagInference.ts     # Pure exercise tag inference & normalization helpers
│   │   ├── normalizers.ts      # Pure runtime record normalizers (equipment, spaces, exercises, settings)
│   │   ├── migrations.ts       # Lossless v2/v3 -> v4 schema migration engine (`parseAppData`)
│   │   ├── defaults.ts         # Default Spaces, exercises, warm-up/cool-down, routine factories
│   │   ├── catalog/            # Modular built-in exercise catalog (`dumbbells`, `bandsAndWall`, `floorAndRoller`, `index`)
│   │   ├── generator.ts        # Tag-driven circuit builder with Space filtering & Shuffle variation
│   │   ├── presets.ts          # Thin public entrypoint re-exporting catalog + generator
│   │   └── timeline.ts         # Pure timeline builder, duration calculation, MM:SS formatting
│   ├── engine/
│   │   ├── animations/         # Pure 60 FPS 2D SVG pose registry & easing math (`math`, `poses*`, `index`)
│   │   ├── kinematics3d/       # Pure 3D kinematics, 2-bone IK & motion guides (`types`, `ik`, `poses*`, `motionGuides`, `index`)
│   │   ├── muscleHighlights.ts # Pure anatomical muscle-region highlight resolver & 2D/3D color tokens
│   │   └── timer.ts            # Drift-free wall-clock timer state machine (injectable clock)
│   ├── services/
│   │   ├── storage.ts          # StorageAdapter seam + LocalStorageAdapter + JSON backup helpers
│   │   ├── backup.ts           # Browser JSON backup download & file-read helpers
│   │   ├── pwa.ts              # Offline PWA service-worker update controller
│   │   ├── audio.ts            # Web Audio API interval beep synthesizer
│   │   ├── speech.ts           # Optional Web Speech API voice coaching announcements
│   │   ├── wakeLock.ts         # Screen Wake Lock API wrapper with visibilitychange re-acquire
│   │   └── foldable.ts         # Viewport Segments Flex Mode detection + manual Floor Mode controller
│   ├── state/
│   │   ├── types.ts            # Public `WorkoutStore`, `WorkoutStoreState`, `WorkoutStoreDependencies`
│   │   ├── toastQueue.ts       # Encapsulated toast queue with auto-dismiss & persistent actions
│   │   ├── mutations.ts        # Pure routine, exercise, space & session-record mutation helpers
│   │   ├── workoutStore.ts     # Encapsulated reactive store wiring data, Spaces, timer, services
│   │   └── storeContext.tsx    # Zero-dependency `WorkoutStoreContext` + `useStoreSelector` render isolation
│   └── components/
│       ├── App.tsx             # Root shell, keyboard shortcuts, `ActiveModal` union & selector-isolated subtrees
│       ├── AppModals.tsx       # Connected lazy modal host driven by `ActiveModal` discriminated union
│       ├── ErrorBoundary.tsx   # Top-level & stage-level error boundary with recovery fallback
│       ├── phaseTheme.ts       # Shared phase badge/ring/spotlight tokens & timer progress math
│       ├── icons.tsx           # Shared accessible SVG icon components
│       ├── HeaderBar.tsx       # Compact mobile-first timer pill, transport, Floor Mode & audio/voice toggles
│       ├── FlexWorkoutView.tsx # Galaxy Z Flip Flex / Floor Mode split layout (top display, bottom controls)
│       ├── WorkoutStage.tsx    # Active/preview exercise stage, New Workout bar, form cues, Up Next
│       ├── ExerciseDemonstrator.tsx # Unified 3D/2D demonstrator seam with lazy Stage3D & WebGL fallback
│       ├── AthleteSvg.tsx      # 60 FPS ref-driven 2D SVG fallback renderer (zero per-frame re-renders)
│       ├── athleteSvgDom.ts    # Direct SVG DOM attribute & muscle-highlight mutators
│       ├── stage3d/
│       │   ├── Stage3D.tsx         # Lazy-loaded Preact wrapper hosting the 60 FPS Three.js 3D canvas
│       │   ├── threeScene.ts       # Renderer, studio lighting, floor/mat & rAF loop controller
│       │   ├── mannequinRig.ts     # Procedural stylized 3D mannequin meshes & emissive muscle pulse
│       │   ├── propsRig.ts         # Dynamic 3D dumbbells, elastic band, foam roller, wall & guides
│       │   ├── orbitController.ts  # Smooth camera preset interpolation & pointer drag orbit
│       │   └── stageHelpers.ts     # Shared Three.js segment alignment & GPU resource tracker
│       ├── RoutineSidebar.tsx  # Exercise list controls (preview, reorder, toggle, edit, delete, browser)
│       ├── ToastHost.tsx       # Accessible alert/status live-region toast notifications
│       ├── ui/
│       │   ├── dialog.tsx            # shadcn + Base UI Dialog primitive (@base-ui/react/dialog)
│       │   ├── switch.tsx            # shadcn + Base UI Switch primitive (@base-ui/react/switch)
│       │   ├── tabs.tsx              # shadcn + Base UI Tabs primitive (@base-ui/react/tabs)
│       │   └── segmented-control.tsx # Reusable accessible segmented pill toggle
│       ├── settings/
│       │   └── SpacesPanel.tsx     # Workout Spaces list & Add/Edit form for Settings -> Spaces tab
│       └── modals/
│           ├── ModalDialog.tsx          # Shared modal shell composing @/components/ui/dialog
│           ├── NewWorkoutModal.tsx      # 1-screen Space + duration + muscle group builder with Shuffle
│           ├── ExerciseLibraryModal.tsx # Searchable, filterable All Exercises browser with live 60 FPS preview
│           ├── ExerciseModal.tsx        # Add/Edit exercise with animation, equipment & tag chips
│           ├── SettingsModal.tsx        # Unified tabbed Settings (Timer & Audio, Spaces, Data & Backup)
│           └── HistoryModal.tsx
└── tests/
    ├── architecture.test.ts    # Pure domain/engine, StorageAdapter, stage3d lazy boundary, 500-line ceiling & EXCEPTIONS sync
    ├── catalog.contract.test.ts # Exercise catalog completeness, tag validity & Space matrix checks
    ├── exercise-demonstrator.test.tsx # WebGL fallback, compact 2D, muscle coloring & 3D/2D toggle tests
    ├── foldable.test.ts        # Viewport Segments auto-detection & manual Floor Mode state machine
    ├── kinematics3d.test.ts    # Pure 3D IK, floor clearance, supination & prop invariants (all 28 moves)
    ├── muscle-highlights.test.ts # Dynamic muscle-region mapping & color specs across all 28 moves
    ├── modal-dialog.test.tsx   # Base UI Dialog rendering, close button & Escape dismissal
    ├── production-hardening.test.tsx # ErrorBoundary, storage alerts, and PWA update toast deferral
    ├── store-selector.test.tsx # `useStoreSelector` 1 Hz render isolation, injectable clock/IDs & toastQueue
    ├── schema.test.ts          # Schema v4 validation, v2/v3 -> v4 migration, Space & tag inference
    ├── presets.test.ts         # Space equipment filtering, weight substitution, shuffle & durations
    ├── timeline.test.ts        # Timeline ordering, overrides, formatting
    ├── timer.test.ts           # Wall-clock sleep/drift recovery, pause/resume, completion guards
    ├── animations.test.ts      # Math helpers, supination & viewBox invariants across all animations
    └── app.component.test.tsx  # Preact integration tests
```

## 5. Architectural Guidelines & Conventions

1. **Keep Domain & Engine Logic Pure & Testable**:
   - Everything in `src/domain/` and `src/engine/` must remain free of DOM (`document`/`window`) and UI (`preact`) dependencies so it can be tested directly and deterministically in Vitest (enforced by `tests/architecture.test.ts`).
2. **Never Trigger 60 FPS or 1 Hz Full-Tree Preact Re-Renders**:
   - `AthleteSvg.tsx` and `stage3d/Stage3D.tsx` mutate refs/GPU transforms directly inside `requestAnimationFrame` and pause while `document.hidden` (or modal-covered). Keep per-frame animation math inside `src/engine/`.
   - Subscribe UI subtrees via `useStoreSelector` (`src/state/storeContext.tsx`) so 1 Hz timer ticks only re-render the timer HUD.
3. **Hard 500-Line Ceiling & Clean Module Boundaries (`ADR-0007`)**:
   - Every `.ts`/`.tsx` file under `src/` must stay at or below **500 lines** (enforced by `tests/architecture.test.ts`). Split growing modules into focused submodules with thin public `index.ts` entrypoints and direct internal sibling imports (zero circular deps).
   - `src/components/stage3d/` may only be dynamically imported by `ExerciseDemonstrator.tsx` (enforced by `tests/architecture.test.ts`).
4. **Preserve Offline-First Persistence & Backwards Compatibility**:
   - All persistence goes through the `StorageAdapter` interface in `src/services/storage.ts` (enforced by `tests/architecture.test.ts`).
   - Any schema evolution must increment `SCHEMA_VERSION` in `src/domain/schema.ts` and preserve automatic lossless migration from all prior versions and JSON backups.
5. **Adding a New Exercise or Animation**:
   - Animations: add the new key to `ANIMATION_IDS` in `src/domain/schema.ts` and implement its entries in both `src/engine/animations/` and `src/engine/kinematics3d/` (`ANIMATION_OPTIONS`, `ExerciseModal`, `tests/animations.test.ts`, and `tests/kinematics3d.test.ts` update automatically).
   - Exercises: tag every catalog exercise with accurate `muscleGroups`, `durations`, `requiredEquipment`, `styles`, ≥ 3 clear steps, and a concise `tip` (enforced by `tests/catalog.contract.test.ts`).
6. **Respect Narrow Mobile & Foldable Ergonomics**:
   - Design for `360px` unfolded mobile screens (e.g., Galaxy Z Flip) with **zero horizontal overflow** (enforced by `e2e/mobile-and-flows.spec.ts`). Always add `min-w-0` on CSS Grid/Flex children with truncating content.
   - Modals must use the shared dialog primitive (`ModalDialog.tsx`, backed by `shadcn` + Base UI `Dialog` per [`ADR-0005`](docs/ADR/0005-shadcn-base-ui-component-primitives.md); enforced by `tests/architecture.test.ts`).
   - Keep transport buttons touch-friendly and keyboard shortcuts disabled while typing in form fields or when modals are open.
7. **Standardize Interactive UI Primitives (`shadcn` + Base UI)**:
   - Use **`shadcn` + Base UI (`@base-ui/react`)** in `src/components/ui/` for all reusable interactive primitives (dialogs, drawers/sheets, switches, selects, tabs, toggle groups, popovers, toasts).
   - **Only build a component from scratch when it does not exist in the library**, and follow `shadcn` + Base UI conventions as closely as possible (composable parts, `cn()` class merging, `data-slot`/`data-state` hooks, accessible ARIA/keyboard contracts; see [`ADR-0005`](docs/ADR/0005-shadcn-base-ui-component-primitives.md)).

## 6. Verification Checklist Before Finishing Changes

Run the unified local gate (and E2E when UI/layout/config changes) before committing or opening a PR:

```bash
pnpm check          # typecheck + lint (--deny-warnings) + fmt:check + test + build + check:budget
pnpm test:e2e       # Playwright 360px/390px/1280px zero-overflow & flow tests (required on UI changes)
```
