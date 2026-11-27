/**
 * Zero-dependency Conventional Commits validator & SemVer calculator (ADR-0006).
 *
 * Used by:
 * - `.github/workflows/ci.yml` to validate PR titles against Conventional Commits.
 * - `.github/workflows/release.yml` to auto-tag `vX.Y.Z` and publish GitHub Releases on `main`.
 * - `tests/semver.test.ts` for deterministic unit test coverage.
 */

import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const ALLOWED_TYPES = [
  'feat',
  'fix',
  'refactor',
  'perf',
  'docs',
  'chore',
  'ci',
  'test',
  'build',
  'style',
];

const HEADER_RE =
  /^(feat|fix|refactor|perf|docs|chore|ci|test|build|style)(?:\(([a-z0-9][a-z0-9-]*)\))?(!)?:\s+(.+)$/;

const BREAKING_FOOTER_RE = /^BREAKING[ -]CHANGE:\s+/m;
const SEMVER_TAG_RE = /^v?(\d+)\.(\d+)\.(\d+)$/;

/**
 * Parse a Conventional Commit header (and optional full commit message body).
 * @param {string} rawMessage
 */
export function parseConventionalCommit(rawMessage) {
  const trimmed = String(rawMessage ?? '').trim();
  const [rawHeader = '', ...bodyLines] = trimmed.split(/\r?\n/);
  const header = rawHeader.trim();
  const match = HEADER_RE.exec(header);

  if (!match) {
    return {
      valid: false,
      type: null,
      scope: null,
      breaking: false,
      subject: header,
    };
  }

  const [, type, scope = null, bang, subject] = match;
  const body = bodyLines.join('\n');
  const breaking = Boolean(bang) || BREAKING_FOOTER_RE.test(body);

  return {
    valid: true,
    type,
    scope,
    breaking,
    subject: subject.trim(),
  };
}

/**
 * Parse a `vX.Y.Z` or `X.Y.Z` semver tag.
 * @param {string} rawTag
 */
export function parseSemverTag(rawTag) {
  const match = SEMVER_TAG_RE.exec(String(rawTag ?? '').trim());
  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * Compute the next semver tag from the latest tag and merged commit message.
 *
 * Bump mapping (pre-1.0 0.x aligned to roadmap phases):
 * - `feat!:` / `BREAKING CHANGE:` -> major (`0.x.y -> v1.0.0`, `1.x.y -> v2.0.0`)
 * - `feat:` / `feat(scope):`      -> minor (`v0.2.0 -> v0.3.0`)
 * - `fix:` / `refactor:` / `perf:`-> patch (`v0.2.0 -> v0.2.1`)
 * - `docs:` / `chore:` / `ci:` / `test:` / `build:` / `style:` -> none
 *
 * @param {string} currentTag
 * @param {string} commitMessage
 */
export function computeNextVersion(currentTag, commitMessage) {
  const base = parseSemverTag(currentTag);
  const current = `v${base.major}.${base.minor}.${base.patch}`;
  const parsed = parseConventionalCommit(commitMessage);

  if (!parsed.valid) {
    return { ...parsed, current, next: current, bump: 'none', shouldRelease: false };
  }

  if (parsed.breaking) {
    const next = `v${base.major + 1}.0.0`;
    return { ...parsed, current, next, bump: 'major', shouldRelease: true };
  }

  if (parsed.type === 'feat') {
    const next = `v${base.major}.${base.minor + 1}.0`;
    return { ...parsed, current, next, bump: 'minor', shouldRelease: true };
  }

  if (parsed.type === 'fix' || parsed.type === 'refactor' || parsed.type === 'perf') {
    const next = `v${base.major}.${base.minor}.${base.patch + 1}`;
    return { ...parsed, current, next, bump: 'patch', shouldRelease: true };
  }

  return { ...parsed, current, next: current, bump: 'none', shouldRelease: false };
}

function getArgValue(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return '';
  return args[idx + 1];
}

function runCli(argv) {
  const [command, ...rest] = argv;

  if (command === 'validate') {
    const title = rest.join(' ').trim();
    const parsed = parseConventionalCommit(title);
    if (!parsed.valid) {
      console.error(`Invalid Conventional Commit title: "${title}"`);
      console.error(
        `Expected: <type>(<optional-scope>): <summary> where <type> is one of: ${ALLOWED_TYPES.join(', ')}`,
      );
      console.error('Examples:');
      console.error('  feat(spaces): Phase 3 — Workout Spaces & Expanded Equipment');
      console.error('  fix(ui): eliminate cramped mobile header columns');
      console.error('  docs(adr): add ADR-0006 Conventional Commits versioning');
      process.exit(1);
    }
    console.log(
      `Valid Conventional Commit: type=${parsed.type}${parsed.scope ? ` scope=${parsed.scope}` : ''}${parsed.breaking ? ' breaking=true' : ''}`,
    );
    return;
  }

  if (command === 'next') {
    const current = getArgValue(rest, '--current') || 'v0.0.0';
    const message = getArgValue(rest, '--message');
    const githubOutput = getArgValue(rest, '--github-output');

    const result = computeNextVersion(current, message);
    console.log(JSON.stringify(result, null, 2));

    if (githubOutput) {
      const safeSubject = result.subject.replaceAll(/\r?\n/g, ' ');
      const lines = [
        `should_release=${result.shouldRelease}`,
        `bump=${result.bump}`,
        `current_tag=${result.current}`,
        `next_tag=${result.next}`,
        `subject=${safeSubject}`,
      ];
      appendFileSync(githubOutput, `${lines.join('\n')}\n`, 'utf8');
    }
    return;
  }

  console.error('Usage:');
  console.error('  node scripts/semver.mjs validate "<PR title>"');
  console.error(
    '  node scripts/semver.mjs next --current v0.2.0 --message "<commit>" [--github-output "$GITHUB_OUTPUT"]',
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2));
}
