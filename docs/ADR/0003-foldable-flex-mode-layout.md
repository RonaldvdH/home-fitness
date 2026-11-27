# ADR-0003: Foldable Flip-Phone Flex / Floor Mode Layout Contract

- **Status**: Accepted (Implemented in Phase 2)
- **Date**: 2026-11-26

## Context

A core usage scenario is placing a Samsung Galaxy Z Flip half-folded (~90°–110°) on the floor beside a workout mat while performing floor press, glute bridges, crunches, foam rolling, or Pilates. In standard scrolling layout, the timer and animation do not cleanly align with the angled upper half of the display. Additionally, not all Android browsers (e.g., Ecosia or WebViews) expose the Foldable Viewport Segments CSS API.

## Decision

1. **Dual Activation**:
   - Auto-detect foldable tabletop mode via `(vertical-viewport-segments: 2)` media query when supported by the browser.
   - Always provide a **1-tap manual Floor Mode toggle** in the UI so users on any Android browser can engage the split layout reliably.
2. **Top-Half / Bottom-Half Layout Contract**:
   - **Top Half** (`env(viewport-segment-height 0 0, 50dvh)`): Full-bleed exercise animation + high-contrast giant countdown timer + phase badge + live rep/breath cue.
   - **Bottom Half** (`env(viewport-segment-height 0 1, 50dvh)`): Oversized touch-friendly transport controls (`Prev`, giant `Start/Pause`, `Next`, `Reset`), exercise title + key tip, compact `Up Next`, and quick audio/voice/exit toggles.
3. **Zero-Overflow Invariant**: Both normal unfolded mode (`360×800`) and Flex / Floor Mode (`360×780` split) must maintain zero horizontal overflow (`scrollWidth <= innerWidth`), enforced automatically by Playwright in CI.

## Consequences

- Floor workouts on a flip phone become effortless and hands-free.
- `ExerciseDemonstrator` (2D SVG now, 3D Three.js in Phase 4) must scale cleanly inside both normal cards and `50dvh` top-half containers without clipping.
