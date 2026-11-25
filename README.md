# Dumbbell Circuit Studio

Offline-first home fitness web app for following structured dumbbell circuit workouts on a phone, tablet, or desktop.

## Features

- **60 FPS Animated Form Guide**: Pure procedural SVG athlete demonstrating 9 dumbbell & mobility movements with Slow/Normal tempo controls, dynamic weight badges, and automatic bodyweight rendering for warm-up/cool-down.
- **Drift-Free Interval Timer**: Wall-clock deadline timer resilient to mobile backgrounding/sleep, Screen Wake Lock while active, and non-destructive exercise previewing.
- **Audio & Voice Coaching**: Web Audio interval beeps plus optional Web Speech API announcements for exercise transitions and 3-2-1 countdowns.
- **Offline-First & Installable PWA**: Auto-saves routines, settings, and ISO-timestamped workout history to `localStorage` with validated JSON export/import and full offline caching.

## Development

```bash
pnpm install
pnpm dev
```

### Verification Commands

```bash
pnpm typecheck   # Strict TypeScript check
pnpm lint        # oxlint
pnpm fmt:check   # oxfmt formatting check
pnpm test        # Vitest unit & Preact component tests
pnpm build       # Production PWA build
```

## Deploying & Installing on Android (GitHub Pages)

This repository includes [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) to publish the PWA over free HTTPS via GitHub Pages (required on Android Chrome for PWA installation, Service Worker offline caching, and Screen Wake Lock).

1. In your GitHub repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
2. Push or merge to `main` (or run **Deploy to GitHub Pages** manually from the **Actions** tab on any branch to preview changes on your phone before merging).
3. Open `https://ronaldvdh.github.io/home-fitness/` in Chrome on Android and tap **Add to Home screen / Install app**.
