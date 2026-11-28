# Changelog

All notable changes to **Home Fitness Studio** are documented here.
Versioning follows [Conventional Commits](docs/ADR/0006-conventional-commits-semver-releases.md) with automated GitHub Releases on merge to `main`.

## [0.6.1] - 2026-11-28

### Fixed

- **3D Bicep Curl Supination**: Mirrored left/right wrist rotation so both pinkies turn inward toward the body while keeping dumbbell bars perpendicular to each forearm throughout the curl.
- **3D Anatomical Accuracy**: Aligned Russian twist torso/shoulder rotation with head and hand direction, and prevented backward knee hyperextension on prone push-ups and plank shoulder taps.
- **Floor & Mat Grounding (3D & 2D)**: Grounded floating poses on the mat across Russian twists, supine/prone floor exercises, quadruped kneeling poses, and foam roller movements; rotated the 3D gym mat 90° for Z-axis seated exercises (`russian-twist`).
- **3D Vertical Orbit Axis**: Fixed inverted vertical pointer drag so horizontal and vertical orbiting consistently follow grab-to-rotate controls.

### Changed

- **Readable Rep Tempo Cues**: Replaced the rapidly flashing top-right cue pill with a calm, static 4-step rep tempo strip below the stage that softly highlights the active phase without layout shift.
- **3D Motion Guidelines**: Added subtle dashed emerald 3D trajectory curves and peak target dots to the 3D stage matching the 2D form guides.

## [0.6.0] - 2026-11-28

### Added

- Dynamic primary (emerald) and secondary (amber) anatomical muscle-group highlighting synchronized across both 3D and 2D demonstrators with peak contraction pulse.

## [0.5.0] - 2026-11-28

### Added

- Real-time 60 FPS procedural Three.js 3D mannequin demonstrator across all 28 exercises with dynamic props (dumbbells, bands, wall, foam roller), touch/mouse orbit + reset, lazy code splitting, and automatic 2D SVG fallback (ADR-0002).

## [0.4.0] - 2026-11-27

### Added

- Unified tabbed Settings hub (Timer & Audio, Spaces, Data & Backup) and searchable **All Exercises** library browser with live 60 FPS previews.

## [0.3.0] - 2026-11-27

### Added

- **Workout Spaces & Expanded Catalog** (ADR-0004): Space-aware equipment filtering (dumbbells, resistance bands, wall, floor, foam roller), automatic dumbbell weight substitution, Pilates/mobility styles, and schema v4 migration.

## [0.2.0] - 2026-11-27

### Added

- **Flip-Phone Flex / Floor Mode** (ADR-0003): Split top-display / bottom-controls layout for foldable devices (Galaxy Z Flip) with Viewport Segments auto-detection and manual Floor Mode toggle.

## [0.1.2] - 2026-11-27

### Fixed

- Optimized mobile stage header columns and single-line banners for 360px viewports.

## [0.1.1] - 2026-11-27

### Changed

- Migrated `ModalDialog` to `shadcn` + Base UI Dialog primitives (ADR-0005).

## [0.1.0] - 2026-11-27

### Added

- AI Quality Guardrail Foundation: automated architecture & catalog contract tests, initial JS/CSS gzipped bundle budget checks, and Playwright Chromium mobile overflow/flow E2E suite.

## [0.0.1] - 2026-11-27

### Added

- Initial Preact + TypeScript offline-first PWA foundation with drift-free interval timer, Screen Wake Lock, Web Audio/Speech coaching, 1-screen New Workout setup overlay, and GitHub Pages deployment.
