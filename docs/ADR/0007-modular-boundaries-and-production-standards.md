# ADR-0007: Modular Boundaries & Production Standards

- **Status**: Accepted
- **Date**: 2026-11-28

## Context

As Home Fitness Studio grew through Phases 0–4 (Spaces, 28 exercises, 2D SVG + 3D Three.js demonstrators, Flex / Floor Mode, and offline PWA hardening), several core files exceeded 700–1,400 lines (`presets.ts`, `schema.ts`, `kinematics3d.ts`, `animations.ts`, `threeScene.ts`, `AthleteSvg.tsx`, `workoutStore.ts`). Monolithic files increase AI token cost per edit, raise merge-conflict risk, and blur architectural seams between pure math, rendering, state orchestration, and UI chrome.

## Decision

1. **Module Anatomy & Thin Public Entrypoints**:
   - Split large subsystems into focused submodules under feature folders (e.g., `src/domain/catalog/`, `src/engine/kinematics3d/`, `src/engine/animations/`, `src/components/stage3d/`).
   - Expose a thin public `index.ts` (or compatibility barrel such as `src/domain/presets.ts`) for external consumers.
   - Internal modules must use **direct sibling imports only**—never import through their own folder's `index.ts`—ensuring **zero circular dependencies**.
2. **Hard 500-Line Ceiling per `src/` File**:
   - Every source file under `src/` must stay at or below **500 lines**, enforced automatically in `tests/architecture.test.ts` once the modularization sequence completes.
   - Rare, justified exceptions require an explicit `EX-NNN` entry in [`docs/EXCEPTIONS.md`](../EXCEPTIONS.md) with a revisit trigger.
3. **Strict Layer & Lazy-Loading Boundaries**:
   - `src/domain/` and `src/engine/` remain 100% pure (zero `preact`, `components`, `services`, `state`, or browser globals).
   - `src/components/stage3d/` may only be dynamically imported by `src/components/ExerciseDemonstrator.tsx` so Three.js never enters the initial JS bundle (`<= 55 kB` gzip).
   - Browser I/O (`localStorage`, `FileReader`, `createObjectURL`, `serviceWorker`) stays isolated inside `src/services/`.
4. **Offline-First & Runtime Resilience Standards**:
   - Zero external CDN links in `index.html`; all fonts, styles, icons, and assets precached by the Vite PWA service worker.
   - Top-level and stage-level `ErrorBoundary` guards prevent a WebGL or UI exception from blanking the timer.
   - State updates use `WorkoutStoreContext` + `useStoreSelector` (zero new runtime dependencies) so 1 Hz timer ticks do not re-render unrelated subtrees, while 60 FPS demonstrators remain ref/GPU-driven with zero per-frame Preact re-renders.
5. **New Feature Checklist**:
   - Pure domain/engine logic + unit tests first -> service/store wiring -> UI using `shadcn` + Base UI primitives -> verify `<= 500` lines/file, `360px` zero-overflow, `pnpm check`, and `pnpm test:e2e`.

## Consequences

- Every subsystem fits comfortably within a single AI context read, reducing token spend and making Phase 5+ (Pilates/Mobility) additions localized and predictable.
- Automated Vitest guardrails enforce module boundaries, lazy-chunk isolation, offline purity, and file size ceilings on every PR.
