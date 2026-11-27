# Product & Engineering Roadmap — Home Fitness Studio

This document is the authoritative, repo-resident development roadmap for **Home Fitness Studio** (built and maintained primarily by AI coding agents). Every phase below defines **User Value**, **Technical Scope**, **Data/Contract Changes**, and **Mandatory Automated Quality Guardrails** that must pass before the phase is considered complete.

> **For AI Agents**: Before implementing any phase, read the relevant Architecture Decision Records in [`docs/ADR/`](./ADR/) and follow [`AGENTS.md`](../AGENTS.md). Every phase ships on a dedicated feature branch via PR with all CI checks green, and updates the phase status table below upon completion.

---

## Roadmap Overview & Status

| Phase       | Name                                | Primary Outcome                                                                                                                                                                 | Status        |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **Phase 0** | Stabilized Foundation               | Preact + TypeScript, `AppDataV3`, drift-free timer + Wake Lock + voice cues, offline PWA, GitHub Pages CI/CD, 1-screen New Workout overlay with tag-driven variation            | **Completed** |
| **Phase 1** | AI Quality Guardrail Foundation     | Repo-enforced Playwright viewport/overflow tests (Galaxy Z Flip 360px + desktop), `oxlint --deny-warnings`, pure-domain import boundary checks, bundle-size budget              | **Next**      |
| **Phase 2** | Flip Phone Flex / Floor Mode        | Auto-detected foldable split (`vertical-viewport-segments: 2`) + manual 1-tap Floor Mode toggle: top half full-bleed animation + giant timer, bottom half thumb controls & cues | Planned       |
| **Phase 3** | Workout Spaces & Expanded Equipment | Schema v4 (`spaces[]`, `requiredEquipment[]`, `styles[]`), named Spaces in New Workout overlay, expanded catalog for elastic bands, wall, floor/mat, foam roller, bodyweight    | Planned       |
| **Phase 4** | Real-Time 3D Exercise Demonstrator  | Lazy-loaded Three.js WebGL stylized 3D mannequin with mat/wall/props, true 3D joint biomechanics, auto camera angles + touch-to-orbit, graceful 2D SVG fallback                 | Planned       |
| **Phase 5** | Pilates & Mobility / Recovery Track | Workout Style selector (`Strength`, `Pilates`, `Mobility`) in New Workout overlay, partner-friendly Pilates/mat/roller/band catalog, slower breath-paced tempo cues             | Planned       |
| **Phase 6** | Progression & Delight Polish        | Streaks/weekly history heatmap from ISO `history[]`, gentle weight-progression nudges per Space, refined breath/transition audio chimes, optional sync via `StorageAdapter`     | Planned       |

---

## Phase 1 — AI Quality Guardrail Foundation

### Goal & User Value

Make the repository self-governing so every future AI-authored feature automatically preserves mobile layout integrity (Galaxy Z Flip unfolded ~360px), runtime performance, architectural purity, and data safety without relying on manual human QA for regressions.

### Scope

1. **Strict Zero-Warning Lint Policy**:
   - Update `pnpm lint` to `oxlint --deny-warnings` so warnings cannot accumulate across AI PRs.
2. **Architectural Boundary Tests** (`tests/architecture.test.ts`):
   - Automated static check asserting files inside `src/domain/` and `src/engine/` never import from `src/components/`, `src/services/`, `src/state/`, `preact`, or reference `window` / `document` / `localStorage`.
3. **Catalog & Tag Contract Tests** (`tests/catalog.contract.test.ts`):
   - Validate every built-in exercise has a unique `id`, valid `animationType`, non-empty `muscleGroups` and `durations`, ≥ 3 non-empty `steps`, and a non-empty `tip`.
4. **Playwright E2E & Mobile Overflow Suite** (`e2e/` + `playwright.config.ts` + CI job):
   - Boot the built Vite preview app in Chromium and assert:
     - Zero console errors and zero uncaught page errors.
     - **Zero horizontal overflow** (`document.documentElement.scrollWidth <= window.innerWidth`) at:
       - Galaxy Z Flip unfolded (`360×800`)
       - Standard phone (`390×844`)
       - Desktop (`1280×800`)
     - Core user journeys: open **New Workout** overlay -> pick duration + muscle group -> shuffle -> start workout -> pause -> preview exercise -> back to workout -> open/close modals with `Escape`.
5. **Bundle Size Budget Check** (`scripts/check-bundle-budget.mjs`):
   - Verify after `pnpm build` that the initial entry JS chunk stays under a strict gzipped ceiling (e.g., `<= 55 kB` gzip for the initial bundle, ensuring future heavy modules like Three.js MUST be lazy-loaded in a separate async chunk).

### Mandatory Guardrails & Definition of Done

- `pnpm typecheck`, `pnpm lint` (`--deny-warnings`), `pnpm fmt:check`, `pnpm test`, `pnpm build`, `pnpm check:budget`, and `pnpm test:e2e` all pass locally and in `.github/workflows/ci.yml`.
- Any layout change that causes horizontal scroll on a 360px viewport fails CI automatically.

---

## Phase 2 — Flip Phone Flex / Floor Mode

### Goal & User Value

Allow placing a Galaxy Z Flip half-folded (~90°–110°) on the floor beside a workout mat so the **top half** acts as an effortless eye-level display and the **bottom half** acts as an accessible flat control deck. (See [`ADR-0003`](./ADR/0003-foldable-flex-mode-layout.md).)

### Scope

1. **Flex Mode Detection + Manual Override** (`src/services/foldable.ts`):
   - Auto-detect foldable tabletop posture using `@media (vertical-viewport-segments: 2)` / `window.matchMedia('(vertical-viewport-segments: 2)')`.
   - Provide a 1-tap manual **Floor Mode** toggle button in `HeaderBar` (works in every Android browser including Ecosia/WebViews that don't expose Viewport Segments API).
   - Persist preference optionally or keep session-scoped with clear "Exit Floor Mode" button.
2. **Dedicated Split-Screen Layout** (`src/components/FlexWorkoutView.tsx`):
   - **Top Segment** (`height: env(viewport-segment-height 0 0, 50dvh)`):
     - Full-bleed exercise animation stage (maximum readability from the floor)
     - High-contrast giant countdown timer + phase badge + live rep/movement cue overlaid cleanly without obscuring the athlete
   - **Bottom Segment** (`height: env(viewport-segment-height 0 1, 50dvh)`):
     - Oversized touch transport controls (`Prev`, giant `Start/Pause`, `Next`, `Reset`)
     - Active exercise title + current key form tip
     - Compact `Up Next` card + quick Mute / Voice / Exit Floor Mode toggles
3. **Scroll Lock & Viewport Polish**:
   - In Floor Mode, lock the view to `100dvh` with zero page scroll so tapping the bottom half never shifts the top-half visual.

### Mandatory Guardrails & Definition of Done

- Unit tests for foldable media-query detection & manual toggle state transitions.
- Playwright E2E test at `360×780` toggling **Floor Mode**: asserts zero vertical/horizontal overflow, top half contains animation + countdown within top 50% of viewport, bottom half contains transport controls within bottom 50% of viewport.

---

## Phase 3 — Workout Spaces & Expanded Equipment Catalog

### Goal & User Value

Let users define named **Workout Spaces** (e.g., `"Home Gym"`, `"Living Room"`, `"Travel"`) with the exact equipment and surfaces available there, and expand the exercise catalog to include **elastic/resistance bands**, **wall**, **floor/mat**, **foam roller**, and **bodyweight** exercises. (See [`ADR-0004`](./ADR/0004-spaces-equipment-and-workout-styles.md).)

### Scope

1. **Schema Evolution (`schemaVersion: 4`)** (`src/domain/schema.ts`):
   - Introduce `EquipmentTag = 'dumbbells' | 'bands' | 'wall' | 'floor' | 'foam-roller' | 'kettlebell'` (`[]` = standing bodyweight).
   - Introduce `WorkoutStyle = 'strength' | 'pilates' | 'mobility'` (added now so Phase 5 requires zero breaking schema migration!).
   - Introduce `WorkoutSpace`:
     ```ts
     export interface WorkoutSpace {
       id: string;
       name: string;
       availableEquipment: EquipmentTag[];
       dumbbellWeightKg: number; // Drives dynamic weight labels in 2D/3D!
     }
     ```
   - Add `spaces: WorkoutSpace[]` and `activeSpaceId: string` to `AppDataV4`, with automatic lossless migration from `AppDataV3` (creating sensible default spaces: `"Home Gym"`, `"Living Room"`, `"Travel"`).
   - Extend `Exercise` with `requiredEquipment: EquipmentTag[]` and `styles: WorkoutStyle[]` (inferred automatically on migration from legacy exercises).
2. **Spaces UI & Integration into 1-Screen New Workout Overlay**:
   - Add a compact **Space Selector** row at the top of `NewWorkoutModal` (e.g., `Home Gym`, `Living Room`, `Travel` + quick gear icon to edit/add a Space).
   - Generator filters strictly by `activeSpace.availableEquipment ⊇ exercise.requiredEquipment` in addition to `durations` and `muscleGroups`, and automatically substitutes the Space's `dumbbellWeightKg` into dumbbell exercises.
   - Add `SpacesModal` (or inline drawer in Settings/New Workout) to add, rename, edit equipment checkboxes, and set dumbbell weight per Space.
3. **Expanded Exercise Catalog & Procedural Animations**:
   - Add curated exercises + animations for:
     - **Elastic / Resistance Bands**: Band Pull-Aparts, Banded Rows, Banded Glute Kickbacks, Banded Bicep Curls
     - **Wall**: Wall Sits, Wall Push-Ups, Wall Angels (mobility)
     - **Floor / Mat (Bodyweight)**: Push-Ups, Bird-Dogs, Dead Bugs, Superman Holds
     - **Foam Roller**: Thoracic Spine Extensions, Quad/IT-Band Roll, Glute Roll, Roller Core Dead Bugs

### Mandatory Guardrails & Definition of Done

- `tests/schema.test.ts`: full v2 -> v3 -> v4 migration tests + corrupt-data recovery.
- `tests/presets.test.ts`: matrix test proving **every** `(Default Space × Duration × Muscle Group)` only returns exercises whose `requiredEquipment` is a subset of `Space.availableEquipment`, and gracefully explains/handles empty equipment combinations.
- Playwright E2E test switching Space in New Workout overlay (e.g., `"Travel"` with no dumbbells -> confirms zero dumbbell exercises appear in the generated circuit).

---

## Phase 4 — Real-Time 3D Exercise Demonstrator (Three.js)

### Goal & User Value

Upgrade the visual demonstrator from 2D stick-figure SVG to a smooth, real-time **3D procedural gym stage** using Three.js with a stylized articulated 3D mannequin, mat/wall environment, realistic 3D props (dumbbells, elastic bands, foam roller), true 3D joint rotations (including authentic wrist supination, torso rotation, and depth), automatic best camera angle per exercise, and optional touch-to-orbit. (See [`ADR-0002`](./ADR/0002-procedural-3d-mannequin-demonstrator.md).)

### Scope

1. **Pure 3D Kinematics Engine** (`src/engine/kinematics3d.ts` — zero DOM/WebGL imports):
   - Define typed `RigPose3D` (pelvis position/rotation, spine/chest/head Euler rotations, bilateral shoulder/elbow/wrist/hip/knee/ankle joint rotations, active props + attachment targets, and recommended `CameraPreset`).
   - Implement clean 3D pose evaluators for all catalog animations, sharing the same `getSmoothCycle(t)` easing and rep cues.
2. **Lazy-Loaded Three.js Renderer Component** (`src/components/Stage3D.tsx` + `src/engine/threeScene.ts`):
   - Dynamically imported (`import('./Stage3D')`) so initial app boot & bundle budget stay tiny.
   - Procedural stylized 3D mannequin (capsule limbs, sphere joints, clear torso/head silhouette, subtle rim lighting & floor shadow on a dark slate mat + optional wall backdrop).
   - Dynamic 3D props bound to the active exercise & Space:
     - Dumbbells (with crisp texture/badge reflecting Space `dumbbellWeightKg`)
     - Elastic resistance band (curved dynamic tube stretching between anchor/hands/feet)
     - Foam roller cylinder positioned accurately under thoracic spine / legs / hips
     - Wall plane automatically faded in for wall exercises (`wall-sit`, `wall-pushup`, `wall-angels`)
   - Smooth camera interpolation between exercise camera presets (`front`, `side`, `three-quarter`, `floor-low`) + lightweight touch-drag orbit with a 1-tap "Reset View" button.
   - Automatic `document.hidden` rAF pause, proper GPU geometry/material/renderer disposal on unmount, and clean automatic fallback to `AthleteSvg` if WebGL context creation fails or is disabled.
3. **Unified Demonstrator Seam** (`src/components/ExerciseDemonstrator.tsx`):
   - Single component consumed by both `WorkoutStage` and `FlexWorkoutView` (works seamlessly in Flex / Floor Mode!).

### Mandatory Guardrails & Definition of Done

- Pure unit tests (`tests/kinematics3d.test.ts`) verifying every animation's `RigPose3D` across `t ∈ [0, 1]` produces finite rotations/positions, valid joint angle ranges, valid prop specs, and non-floor-clipping pelvis/foot heights.
- Initial entry bundle size stays within the Phase 1 budget (Three.js verified in a separate async chunk).
- Playwright E2E test verifies canvas renders without WebGL/console errors (and verifies graceful 2D fallback when WebGL is mocked unavailable).

---

## Phase 5 — Pilates & Mobility / Recovery Track (Partner Onboarding)

### Goal & User Value

Onboard your partner cleanly on their own phone by introducing **Pilates** and **Mobility / Recovery** workout styles—complete with slower breath-paced tempos, gentle breathing cues, and a dedicated mat/foam-roller/band Pilates exercise library.

### Scope

1. **Workout Style Selector in New Workout Overlay**:
   - Add a sleek compact pill switcher at the top of `NewWorkoutModal`: `Strength` | `Pilates` | `Mobility` (remembers last chosen style per device so your partner's phone defaults straight to `Pilates` once picked!).
   - Preset timing adapts naturally per style:
     - `Strength`: energetic HIIT/circuit intervals (`35–45s` work / `15–20s` rest)
     - `Pilates`: slower controlled flow (`45–50s` work / `10–15s` smooth transition, slower `0.7x` animation cadence by default)
     - `Mobility`: unhurried holds & foam rolling (`45–60s` per move / `10s` transition)
2. **Breath-Paced Coaching Cues**:
   - Optional `breathCue` phases (`Inhale Prepare`, `Exhale Engage`) on Pilates & Mobility animations, reflected cleanly in the live stage cue pill and optional calm voice guidance.
3. **Curated Pilates & Mobility Exercise Catalog + 3D Animations**:
   - Pilates Mat & Props: The Hundred, Single-Leg Stretch, Pilates Shoulder Bridge, Swan Prep, Side-Lying Leg Lifts, Spine Twist, Banded Clam Shells, Foam Roller Core March, Swimming.
   - Mobility / Recovery: Cat-Cow, Thoracic Foam Roller Opener, World's Greatest Stretch, Wall Angels, Child's Pose Breathing.

### Mandatory Guardrails & Definition of Done

- Catalog contract tests verify every Pilates & Mobility exercise has valid `styles`, `requiredEquipment`, `muscleGroups`, `durations`, and valid 3D + 2D fallback animations.
- Preset matrix tests confirm `(Style × Space × Duration × Muscle Group)` builds valid circuits (with smart UX feedback if a Space lacks equipment for a chosen style).
- Playwright E2E test verifying selecting `Pilates` in New Workout persists across reload and runs with breath cues.

---

## Phase 6 — Progression & Delight Polish (Future Horizon)

### Goal & User Value

Reward consistency and guide gentle progression over weeks while preserving the zero-account, offline-first ethos.

### Scope

- **History Insights & Consistency Calendar**: Weekly workout streak, minutes trained, muscle-group balance summary, and calendar dots computed purely from ISO `history[]` (`SessionRecord.completedAt`).
- **Gentle Weight Progression Nudges**: After repeated completions in a Space, optionally suggest bumping the Space's dumbbell weight (e.g., `5kg -> 6kg` or `7.5kg`).
- **Refined Audio Themes**: Soft chime/breath cues option for Pilates/Mobility alongside classic interval beeps.
- **Optional Future Sync**: Because all persistence flows through [`StorageAdapter`](../src/services/storage.ts), encrypted export or opt-in cloud sync can still be added later without touching domain or UI code.
