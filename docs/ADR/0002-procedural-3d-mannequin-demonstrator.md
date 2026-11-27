# ADR-0002: Procedural 3D Stylized Mannequin (Three.js) with 2D SVG Fallback

- **Status**: Accepted (Planned for Phase 4)
- **Date**: 2026-11-26

## Context

As the exercise library expands to include wrist supination, rotational core movements, wall exercises, elastic bands, foam rollers, and Pilates mat work, flat 2D stick figures hit readability and depth limits. Pre-rendered AI video clips (e.g., Google Flow) would create large binary asset storage and offline PWA cache bloat as the catalog grows to 30–60+ exercises.

## Decision

1. **Pure Real-Time Procedural 3D Engine**: Build the upgraded demonstrator on **Three.js** using a **clean procedural stylized 3D mannequin** (capsule limbs, articulated joints, gym mat, dynamic wall/props) driven purely by typed 3D joint kinematics (`src/engine/kinematics3d.ts`).
2. **Pure Math Separation**: Keep all 3D pose calculations, joint angle curves, prop placement math, and camera presets in a DOM/WebGL-free module (`src/engine/kinematics3d.ts`) so Vitest can validate joint bounds, finite coordinates, and floor clearance without a GPU.
3. **Lazy Code Splitting**: Dynamically import Three.js (`Stage3D.tsx`) so the initial entry JS bundle remains fast and within the CI bundle budget.
4. **Camera & Interaction**: Each exercise defines an optimal default camera angle (`front`, `side`, `three-quarter`, `floor-low`), with optional touch-drag orbit and a 1-tap reset.
5. **Graceful Fallback**: Keep `AthleteSvg.tsx` as a lightweight fallback whenever WebGL is unavailable or disabled (e.g., restricted browsers or minimal test environments), behind a unified `ExerciseDemonstrator` component.

## Consequences

- Infinite exercise/prop scalability with zero video hosting costs and 100% offline PWA reliability.
- AI agents can author, review, and unit-test every new exercise animation purely in TypeScript.
- Requires careful WebGL resource disposal (`dispose()` on unmount) and `document.hidden` throttling to preserve phone battery.
