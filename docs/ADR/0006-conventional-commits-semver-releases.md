# ADR-0006: Conventional Commits & Automated 0.x Phase-Aligned SemVer Releases

- **Status**: Accepted
- **Date**: 2026-11-27

## Context

The repository ships every roadmap phase and bug fix via squash-merged pull requests to `main`, deployed automatically to GitHub Pages. We want clear git tags and GitHub Releases for every user-facing change and roadmap phase without burning GitHub Actions free-tier minutes on extra Release PRs or double CI builds.

## Decision

1. **Conventional Commit PR Titles & Squash Commits**:
   - Every PR title must follow `<type>(<optional-scope>)<!>: <summary>` where `<type>` is one of `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`, `ci`, `test`, `build`, `style`.
   - Enforced automatically inside the CI `verify` job via `node scripts/semver.mjs validate "$PR_TITLE"` (zero extra runner spin-up).
2. **Pre-1.0 `0.x` Phase-Aligned SemVer Mapping**:
   - Backfilled historical milestones: `v0.0.1` (Phase 0), `v0.1.0` (Phase 1), `v0.1.1` (`shadcn` + Base UI Dialog), `v0.1.2` (mobile spacing fix), `v0.2.0` (Phase 2).
   - Automatic bumps on merge to `main` (`.github/workflows/release.yml` using `scripts/semver.mjs`):
     - `feat!:` / `BREAKING CHANGE:` -> **major** (`0.x.y -> v1.0.0`, `1.x.y -> v2.0.0`)
     - `feat:` / `feat(scope):` -> **minor** (`v0.2.0 -> v0.3.0`, aligning cleanly with roadmap phases)
     - `fix:` / `refactor:` / `perf:` -> **patch** (`v0.2.0 -> v0.2.1`)
     - `docs:` / `chore:` / `ci:` / `test:` / `build:` / `style:` -> **no tag**
3. **Tag-Only Releases (Zero Double Builds) & Live PWA Version Stamp**:
   - `.github/workflows/release.yml` pushes an annotated git tag (`vX.Y.Z`) and publishes a GitHub Release (`gh release create --generate-notes`) without pushing a bot commit back to `main`, avoiding double CI/Pages runs.
   - `vite.config.ts` and `.github/workflows/deploy-pages.yml` inject `import.meta.env.VITE_APP_VERSION` into the built PWA, displayed inside `HistoryModal` so users can immediately verify which version is cached on their phone.

## Consequences

- Every merged feature and fix automatically gets an annotated git tag and GitHub Release notes in ~10 seconds with zero manual tagging overhead.
- Future AI agents must format PR titles and squash commits using Conventional Commits so versioning stays deterministic.
