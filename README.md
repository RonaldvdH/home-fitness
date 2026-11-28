# Home Fitness Studio

Offline-first home interval workout trainer for phones, foldables, tablets, and desktop — featuring a 60 FPS procedural 3D & 2D form demonstrator, dynamic muscle highlighting, Workout Spaces, and zero-backend PWA persistence.

## Features

- **60 FPS 3D & 2D Form Demonstrator**: Procedural Three.js stylized 3D mannequin (with automatic 2D SVG fallback) covering **28 strength, core, Pilates, wall, band, and foam-roller exercises**, complete with touch/mouse orbit controls, 3D motion-path guidelines, dynamic primary/secondary muscle-group highlighting, and a calm 4-step rep tempo cue strip.
- **Workout Spaces & Smart Equipment Filtering**: Switch between Spaces (e.g., Home Gym, Living Room, Travel / Bodyweight) to automatically filter exercises by available gear (dumbbells, resistance bands, wall, floor, foam roller) and adapt dumbbell weights.
- **1-Screen Workout Builder & Exercise Library**: Generate 10/15/20-minute workouts by target muscle group with one-tap Shuffle, or browse and preview all exercises live in the searchable **All Exercises** modal.
- **Foldable Flex / Floor Mode**: Split-screen mode for Galaxy Z Flip and floor workouts — angled top display with full-bleed animation and giant timer, bottom deck with oversized touch controls.
- **Drift-Free Interval Timer & Coaching**: Wall-clock interval timer resilient to mobile backgrounding/sleep, Screen Wake Lock while active, Web Audio interval beeps, optional Web Speech voice cues, and non-destructive exercise previewing.
- **Offline-First Installable PWA**: Versioned `localStorage` persistence with automatic lossless schema migrations, unified Settings hub (Timer & Audio, Spaces, Data & Backup), validated JSON export/import, and full offline caching.

## Development

```bash
pnpm install
pnpm dev
```

### Verification Commands

```bash
pnpm check        # Full local gate (typecheck, lint, fmt:check, test, build, check:budget)
pnpm typecheck    # Strict TypeScript check
pnpm lint         # oxlint --deny-warnings
pnpm fmt:check    # oxfmt formatting check
pnpm test         # Vitest unit, contract, architecture & Preact component tests
pnpm build        # Production PWA build
pnpm check:budget # Enforce initial entry JS/CSS gzipped bundle budgets
pnpm test:e2e     # Playwright Chromium mobile overflow & flow E2E tests
```

## Documentation & Release History

- [CHANGELOG.md](CHANGELOG.md) — Release history and summary notes
- [docs/ROADMAP.md](docs/ROADMAP.md) — Multiphase feature & quality roadmap
- [docs/ADR/](docs/ADR/) — Architecture Decision Records
- [AGENTS.md](AGENTS.md) — Engineering guidelines & architectural contracts

## Deploying & Installing on Android (GitHub Pages)

This repository includes [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) to publish the PWA over HTTPS via GitHub Pages (required on Android Chrome for PWA installation, Service Worker offline caching, and Screen Wake Lock).

1. In your GitHub repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
2. Push or merge to `main` (or run **Deploy to GitHub Pages** manually from the **Actions** tab on any branch to preview changes on your phone before merging).
3. Open `https://ronaldvdh.github.io/home-fitness/` in Chrome on Android and tap **Add to Home screen / Install app**.
