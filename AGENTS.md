# AGENTS.md — Dumbbell Circuit Studio

Instructions and engineering guidelines for AI coding agents and human contributors working in this repository.

## 1. Project Overview & Tech Stack

**Dumbbell Circuit Studio** is an offline-first home interval workout trainer featuring a 60 FPS procedural SVG form demonstrator, wall-clock interval timer with Screen Wake Lock, Web Audio interval beeps + optional Web Speech voice cues, a customizable circuit routine builder, and versioned `localStorage` persistence with JSON backup/restore.

- **Package Manager**: `pnpm` (do not commit `npm` or `yarn` lockfiles)
- **UI & Language**: Preact (`preact`) + strict TypeScript (`typescript`)
- **Bundler / Dev Server / PWA**: Vite (`vite.config.ts`) + `vite-plugin-pwa`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + custom CSS in `src/styles/main.css`
- **Linting & Formatting**: `oxlint` (`.oxlintrc.json`) + `oxfmt` (`.oxfmtrc.json`)
- **Testing**: Vitest (`vitest.config.ts`, `happy-dom`, `@testing-library/preact`)

## 2. Common Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start Vite dev server
pnpm typecheck      # Run strict TypeScript typecheck (tsc --noEmit)
pnpm lint           # Run oxlint across the repository
pnpm fmt            # Auto-format files with oxfmt
pnpm fmt:check      # Check formatting without modifying files
pnpm test           # Run unit & component tests once (vitest run)
pnpm test:watch     # Run tests in watch mode
pnpm build          # Production PWA build to dist/
pnpm preview        # Preview production build
```

## 3. Project Structure & Separation of Concerns

Keep modules strictly organized by responsibility:

```text
├── .github/workflows/ci.yml    # CI pipeline: typecheck, lint, fmt:check, test, build
├── index.html                  # Minimal PWA HTML shell mounting #app
├── public/icon.svg             # Scalable PWA & favicon icon
├── tsconfig.json               # Strict TypeScript config (jsxImportSource: "preact")
├── vite.config.ts              # Vite + Preact + Tailwind v4 + vite-plugin-pwa
├── vitest.config.ts            # Vitest + happy-dom configuration
├── src/
│   ├── main.tsx                # Preact entrypoint mounting <App />
│   ├── styles/main.css         # Tailwind v4 entry, @theme tokens, spotlight styles
│   ├── domain/
│   │   ├── schema.ts           # Versioned TS types (AppDataV3), validators, v2 -> v3 migration
│   │   ├── defaults.ts         # Default dumbbell exercises, warm-up/cool-down, routine factories
│   │   └── timeline.ts         # Pure timeline builder, duration calculation, MM:SS formatting
│   ├── engine/
│   │   ├── animations.ts       # Pure typed 60 FPS SVG pose registry & easing math
│   │   └── timer.ts            # Drift-free wall-clock timer state machine (injectable clock)
│   ├── services/
│   │   ├── storage.ts          # StorageAdapter seam + LocalStorageAdapter + JSON backup helpers
│   │   ├── audio.ts            # Web Audio API interval beep synthesizer
│   │   ├── speech.ts           # Optional Web Speech API voice coaching announcements
│   │   └── wakeLock.ts         # Screen Wake Lock API wrapper with visibilitychange re-acquire
│   ├── state/
│   │   └── workoutStore.ts     # Encapsulated reactive store wiring data, timer, preview, services
│   └── components/
│       ├── App.tsx             # Root shell, keyboard shortcuts, modal coordination
│       ├── HeaderBar.tsx       # Compact mobile-first timer pill, transport & audio/voice toggles
│       ├── WorkoutStage.tsx    # Active/preview exercise stage, pace controls, form cues, Up Next
│       ├── AthleteSvg.tsx      # 60 FPS ref-driven SVG renderer (zero per-frame Preact re-renders)
│       ├── RoutineSidebar.tsx  # Exercise list controls (preview, reorder, toggle, edit, delete, backup)
│       ├── ToastHost.tsx       # Accessible live-region toast notifications
│       └── modals/
│           ├── ModalDialog.tsx # Accessible dialog wrapper (Escape, backdrop click, ARIA)
│           ├── ExerciseModal.tsx
│           ├── SettingsModal.tsx
│           └── HistoryModal.tsx
└── tests/
    ├── schema.test.ts          # Schema validation, v2 -> v3 migration, corrupt storage recovery
    ├── timeline.test.ts        # Timeline ordering, overrides, formatting
    ├── timer.test.ts           # Wall-clock sleep/drift recovery, pause/resume, completion guards
    ├── animations.test.ts      # Math helpers & viewBox invariants across all animations
    └── app.component.test.tsx  # Preact integration tests
```

## 4. Architectural Guidelines & Conventions

1. **Keep Domain & Engine Logic Pure & Testable**:
   - Everything in `src/domain/` and `src/engine/` must remain free of DOM (`document`/`window`) dependencies so it can be tested directly and deterministically in Vitest.
2. **Never Trigger 60 FPS Preact Re-Renders**:
   - `AthleteSvg.tsx` mutates SVG element refs directly inside `requestAnimationFrame` and pauses while `document.hidden`. Keep per-frame animation math inside `src/engine/animations.ts`.
3. **Preserve Offline-First Persistence & Backwards Compatibility**:
   - All persistence goes through the `StorageAdapter` interface in `src/services/storage.ts`.
   - Any future schema evolution must increment `SCHEMA_VERSION` in `src/domain/schema.ts` and preserve automatic migration from prior versions and JSON backups.
4. **Adding a New 60 FPS Exercise Animation**:
   - Add the new key to `ANIMATION_IDS` in `src/domain/schema.ts`.
   - Implement its entry in `ANIMATION_REGISTRY` in `src/engine/animations.ts` (`ANIMATION_OPTIONS` and the Exercise Modal `<select>` update automatically, and `tests/animations.test.ts` automatically validates its pose bounds).
5. **Respect Accessibility & Mobile Workout Ergonomics**:
   - Modals must use `ModalDialog.tsx` (`role="dialog"`, `aria-modal`, `Escape` and backdrop dismiss).
   - Keep transport buttons touch-friendly and keyboard shortcuts disabled while typing in form fields or when modals are open.

## 5. Verification Checklist Before Finishing Changes

Run all five checks before wrapping up any change:

```bash
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm test
pnpm build
```
