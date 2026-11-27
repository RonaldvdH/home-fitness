# ADR-0001: Preact + Strict TypeScript, Offline-First PWA, and StorageAdapter Seam

- **Status**: Accepted
- **Date**: 2026-11-26

## Context

The app is primarily used on an Android phone propped up nearby during home workouts, often with flaky Wi-Fi or offline, and is built and maintained iteratively by AI coding agents. Earlier prototypes statically bundled Firebase (~480 kB JS) and used untyped vanilla DOM manipulation.

## Decision

1. **UI & Language**: Use **Preact + strict TypeScript** (`tsc --noEmit`), **Vite**, and **Tailwind CSS v4** for a tiny runtime footprint and compile-time contract enforcement.
2. **Offline-First Persistence**: Remove cloud SDKs from the core bundle. All persistence goes through the `StorageAdapter` interface in `src/services/storage.ts` backed by `localStorage` + validated JSON backup/restore.
3. **Versioned Schema & Lossless Migrations**: Every schema change increments `SCHEMA_VERSION` in `src/domain/schema.ts` and preserves automatic migration from prior storage versions and JSON backups.
4. **Zero Per-Frame Framework Re-Renders**: 60 FPS animations (2D SVG or 3D WebGL) must run inside dedicated `requestAnimationFrame` loops mutating refs/GPU buffers directly and pause when `document.hidden` is true.
5. **Lazy-Load Heavy Subsystems**: Keep the initial JS bundle small and fast on mobile by dynamically importing heavy optional subsystems (such as Three.js in Phase 4).

## Consequences

- Fast cold loads (~33 kB gzip initial JS), full offline PWA support via `vite-plugin-pwa`, and deterministic unit testing of pure domain/engine modules.
- Future cloud sync can be plugged in via a new `StorageAdapter` without modifying domain logic or UI components.
