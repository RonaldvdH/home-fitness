import { describe, expect, it } from 'vitest';
import { computeNextVersion, parseConventionalCommit, parseSemverTag } from '../scripts/semver.mjs';

describe('Conventional Commits & SemVer release calculator (ADR-0006)', () => {
  it('validates Conventional Commit headers with optional scopes and breaking markers', () => {
    expect(
      parseConventionalCommit('feat(spaces): Phase 3 — Workout Spaces & Expanded Equipment (#11)'),
    ).toEqual({
      valid: true,
      type: 'feat',
      scope: 'spaces',
      breaking: false,
      subject: 'Phase 3 — Workout Spaces & Expanded Equipment (#11)',
    });

    expect(parseConventionalCommit('fix: prevent horizontal scroll on 360px phones')).toEqual({
      valid: true,
      type: 'fix',
      scope: null,
      breaking: false,
      subject: 'prevent horizontal scroll on 360px phones',
    });

    expect(parseConventionalCommit('feat(core)!: graduate to 1.0 release')).toEqual({
      valid: true,
      type: 'feat',
      scope: 'core',
      breaking: true,
      subject: 'graduate to 1.0 release',
    });

    expect(
      parseConventionalCommit('feat(schema): migrate storage\n\nBREAKING CHANGE: drops legacy key'),
    ).toMatchObject({ valid: true, type: 'feat', breaking: true });

    expect(parseConventionalCommit('Add new feature without prefix').valid).toBe(false);
    expect(parseConventionalCommit('FEAT(ui): uppercase type not allowed').valid).toBe(false);
    expect(parseConventionalCommit('feat(BadScope): uppercase scope not allowed').valid).toBe(
      false,
    );
  });

  it('parses semver tags cleanly with safe fallback', () => {
    expect(parseSemverTag('v0.2.0')).toEqual({ major: 0, minor: 2, patch: 0 });
    expect(parseSemverTag('1.4.9')).toEqual({ major: 1, minor: 4, patch: 9 });
    expect(parseSemverTag('not-a-tag')).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it('computes 0.x phase-aligned SemVer bumps accurately', () => {
    // Minor bump for features / roadmap phases
    expect(computeNextVersion('v0.2.0', 'feat(spaces): Phase 3 — Workout Spaces (#11)')).toEqual(
      expect.objectContaining({
        current: 'v0.2.0',
        next: 'v0.3.0',
        bump: 'minor',
        shouldRelease: true,
      }),
    );

    // Patch bump for fix / refactor / perf
    expect(computeNextVersion('v0.2.0', 'fix(ui): align mobile banner button')).toEqual(
      expect.objectContaining({
        current: 'v0.2.0',
        next: 'v0.2.1',
        bump: 'patch',
        shouldRelease: true,
      }),
    );
    expect(computeNextVersion('v0.2.1', 'refactor(ui): migrate ModalDialog')).toEqual(
      expect.objectContaining({
        next: 'v0.2.2',
        bump: 'patch',
        shouldRelease: true,
      }),
    );
    expect(computeNextVersion('v0.2.2', 'perf(stage): cache geometry buffers')).toEqual(
      expect.objectContaining({
        next: 'v0.2.3',
        bump: 'patch',
        shouldRelease: true,
      }),
    );

    // Major bump graduates 0.x -> v1.0.0 and 1.x -> v2.0.0
    expect(computeNextVersion('v0.6.2', 'feat!: ship v1.0.0 full roadmap')).toEqual(
      expect.objectContaining({
        next: 'v1.0.0',
        bump: 'major',
        shouldRelease: true,
      }),
    );
    expect(computeNextVersion('v1.2.3', 'feat!: breaking schema overhaul')).toEqual(
      expect.objectContaining({
        next: 'v2.0.0',
        bump: 'major',
        shouldRelease: true,
      }),
    );

    // Non-releasing commit types do not create noisy tags
    for (const nonReleasing of [
      'docs(adr): add ADR-0006',
      'ci(release): automate semver tagging',
      'chore(deps): update devDependencies',
      'test(e2e): stabilize focus assertion',
      'style: format with oxfmt',
      'build: tweak vite chunks',
    ]) {
      expect(computeNextVersion('v0.2.0', nonReleasing)).toEqual(
        expect.objectContaining({
          next: 'v0.2.0',
          bump: 'none',
          shouldRelease: false,
        }),
      );
    }
  });
});
